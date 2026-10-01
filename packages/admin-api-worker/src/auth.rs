use zygo_core::error::AppError;
use zygo_core::models::User;
use zygo_core::db;
use serde::Deserialize;
use worker::{D1Database, Env, Request};
use base64::Engine;
use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CloudflareAccessIdentity {
    pub email: String,
    pub user_uuid: Option<String>,
    pub sub: Option<String>,
    pub aud: Option<serde_json::Value>,
    pub exp: Option<u64>,
}

// In-memory rate limiter for Service Tokens: maps client_id -> (window_start_secs, count)
static SERVICE_TOKEN_RATE_LIMITS: Mutex<Option<HashMap<String, (u64, u32)>>> = Mutex::new(None);

const RATE_LIMIT_WINDOW_SECS: u64 = 60;
const RATE_LIMIT_MAX_REQUESTS: u32 = 60; // 60 requests per minute per service token

fn current_epoch_seconds() -> u64 {
    #[cfg(target_arch = "wasm32")]
    {
        (worker::Date::now().as_millis() / 1000) as u64
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}

pub fn check_service_token_rate_limit(client_id: &str) -> Result<(), AppError> {
    let now = current_epoch_seconds();
    let mut lock = SERVICE_TOKEN_RATE_LIMITS
        .lock()
        .map_err(|_| AppError::ServerError("Rate limiter lock error".into()))?;
    
    let map = lock.get_or_insert_with(HashMap::new);
    let entry = map.entry(client_id.to_string()).or_insert((now, 0));
    
    if now.saturating_sub(entry.0) >= RATE_LIMIT_WINDOW_SECS {
        entry.0 = now;
        entry.1 = 0;
    }
    
    if entry.1 >= RATE_LIMIT_MAX_REQUESTS {
        return Err(AppError::TooManyRequests(
            "Service Token rate limit exceeded. Please throttle requests.".into(),
        ));
    }
    
    entry.1 += 1;
    Ok(())
}

#[macro_export]
macro_rules! auth_required {
    ($req:expr, $ctx:expr) => {
        match $ctx.env.d1("DB") {
            Ok(db) => match $crate::auth::require_user($req, &$ctx.env, &db).await {
                Ok(user) => user,
                Err(err) => return err.to_response(),
            },
            Err(err) => return worker::Response::error(err.to_string(), 500),
        }
    };
}

fn validate_jwt_claims(
    identity: &CloudflareAccessIdentity,
    expected_aud: Option<&str>,
    now_secs: u64,
) -> Result<(), AppError> {
    // Basic validation for exp claim
    let exp = identity
        .exp
        .ok_or_else(|| AppError::Unauthorized("JWT missing exp claim".into()))?;
    if now_secs > exp {
        return Err(AppError::Unauthorized("JWT has expired".into()));
    }

    // Basic validation for aud claim
    let aud_val = identity
        .aud
        .as_ref()
        .ok_or_else(|| AppError::Unauthorized("JWT missing aud claim".into()))?;
    if let Some(expected_str) = expected_aud {
        let matches = match aud_val {
            serde_json::Value::String(s) => s == expected_str,
            serde_json::Value::Array(arr) => arr.iter().any(|v| v.as_str() == Some(expected_str)),
            _ => false,
        };
        if !matches {
            return Err(AppError::Unauthorized("JWT audience mismatch".into()));
        }
    } else {
        let valid = match aud_val {
            serde_json::Value::String(s) => !s.trim().is_empty(),
            serde_json::Value::Array(arr) => !arr.is_empty(),
            _ => false,
        };
        if !valid {
            return Err(AppError::Unauthorized("JWT aud claim is empty".into()));
        }
    }

    Ok(())
}

pub async fn require_user(req: &Request, env: &Env, db: &D1Database) -> Result<User, AppError> {
    let is_dev = env.var("ENVIRONMENT").ok().map(|v| v.to_string() == "dev").unwrap_or(false);

    if is_dev {
        // Local Dev Auth Mocking
        return resolve_local_user(env, db, "mock-admin-uuid", Some("admin@localhost".to_string())).await;
    }

    // 1. Try Cloudflare Access JWT Assertion header
    let jwt_header_opt = req
        .headers()
        .get("Cf-Access-Jwt-Assertion")
        .map_err(|e| AppError::Unauthorized(format!("Failed to read headers: {}", e)))?;

    if let Some(auth_header) = jwt_header_opt {
        if !auth_header.trim().is_empty() {
            let parts: Vec<&str> = auth_header.split('.').collect();
            if parts.len() != 3 {
                return Err(AppError::Unauthorized("Invalid JWT format".into()));
            }
            
            let payload = parts[1];
            let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(payload.as_bytes())
                .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(payload.as_bytes()))
                .map_err(|_| AppError::Unauthorized("Failed to decode JWT payload".into()))?;
                
            let identity: CloudflareAccessIdentity = serde_json::from_slice(&decoded)
                .map_err(|_| AppError::Unauthorized("Invalid JWT payload".into()))?;

            let expected_aud = env.var("CF_ACCESS_AUD").or_else(|_| env.var("POLICY_AUD")).ok();
            let expected_aud_str = expected_aud.as_ref().map(|v| v.to_string());
            validate_jwt_claims(&identity, expected_aud_str.as_deref(), current_epoch_seconds())?;

            let user_id = identity.user_uuid.or(identity.sub).unwrap_or_else(|| "unknown".to_string());
            return resolve_local_user(env, db, &user_id, Some(identity.email)).await;
        }
    }

    // 2. Alternative auth path: CF-Access-Client-Id and CF-Access-Client-Secret headers (Service Tokens)
    let client_id_opt = req
        .headers()
        .get("CF-Access-Client-Id")
        .map_err(|e| AppError::Unauthorized(format!("Failed to read headers: {}", e)))?;
    let client_secret_opt = req
        .headers()
        .get("CF-Access-Client-Secret")
        .map_err(|e| AppError::Unauthorized(format!("Failed to read headers: {}", e)))?;

    if let (Some(client_id), Some(client_secret)) = (client_id_opt, client_secret_opt) {
        if !client_id.trim().is_empty() && !client_secret.trim().is_empty() {
            // Validate Service Token credentials
            let expected_id = env
                .secret("CF_ACCESS_CLIENT_ID")
                .or_else(|_| env.var("CF_ACCESS_CLIENT_ID"))
                .or_else(|_| env.secret("SERVICE_TOKEN_CLIENT_ID"))
                .or_else(|_| env.var("SERVICE_TOKEN_CLIENT_ID"));

            let expected_secret = env
                .secret("CF_ACCESS_CLIENT_SECRET")
                .or_else(|_| env.var("CF_ACCESS_CLIENT_SECRET"))
                .or_else(|_| env.secret("SERVICE_TOKEN_CLIENT_SECRET"))
                .or_else(|_| env.var("SERVICE_TOKEN_CLIENT_SECRET"));

            match (expected_id, expected_secret) {
                (Ok(exp_id), Ok(exp_sec)) => {
                    if client_id != exp_id.to_string() || client_secret != exp_sec.to_string() {
                        return Err(AppError::Unauthorized("Invalid Service Token credentials".into()));
                    }
                }
                _ => {
                    return Err(AppError::Unauthorized("Service Token authentication is not configured on server".into()));
                }
            }

            // Enforce rate limiting for Service Tokens per AGENTS.md
            check_service_token_rate_limit(&client_id)?;

            let user_id = format!("service-token:{}", client_id);
            let email = format!("service-token-{}@service.cloudflareaccess.com", &client_id[..client_id.len().min(8)]);
            let mut user = resolve_local_user(env, db, &user_id, Some(email)).await?;
            user.role = "admin".into();
            return Ok(user);
        }
    }

    Err(AppError::Unauthorized("Missing authentication credentials".into()))
}

async fn resolve_local_user(env: &Env, db: &D1Database, auth_provider_id: &str, email: Option<String>) -> Result<User, AppError> {
    let is_dev = env.var("ENVIRONMENT").ok().map(|v| v.to_string() == "dev").unwrap_or(false);
    let is_admin_override = (is_dev && auth_provider_id == "mock-admin-uuid") || auth_provider_id.starts_with("service-token:");

    if let Ok(Some(mut user)) = db::find_user_by_auth_id(db, auth_provider_id).await {
        if is_admin_override {
            user.role = "admin".into();
        }
        return Ok(user);
    }
    
    // Auto-provision on first login
    let mut user = match db::create_user(db, auth_provider_id, email.clone()).await {
        Ok(u) => u,
        Err(e) => {
            if is_admin_override {
                return Ok(User {
                    id: 1,
                    auth_provider_id: auth_provider_id.to_string(),
                    email,
                    display_name: Some(if auth_provider_id.starts_with("service-token:") {
                        "Service Token".to_string()
                    } else {
                        "Local Admin".to_string()
                    }),
                    role: "admin".to_string(),
                    created_at: "1970-01-01T00:00:00Z".to_string(),
                    updated_at: "1970-01-01T00:00:00Z".to_string(),
                });
            }
            return Err(AppError::ServerError(format!("Failed to auto-provision user: {}", e)));
        }
    };
        
    if is_admin_override {
        user.role = "admin".into();
    }
    Ok(user)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_token_rate_limiting() {
        let client_id = "test-rate-limit-client";
        for _ in 0..RATE_LIMIT_MAX_REQUESTS {
            assert!(check_service_token_rate_limit(client_id).is_ok());
        }
        // Exceeding limit should return TooManyRequests error
        let err = check_service_token_rate_limit(client_id).unwrap_err();
        assert!(matches!(err, AppError::TooManyRequests(_)));
    }

    #[test]
    fn test_validate_jwt_claims_valid() {
        let identity = CloudflareAccessIdentity {
            email: "user@example.com".into(),
            user_uuid: Some("uuid-123".into()),
            sub: None,
            aud: Some(serde_json::json!("expected-aud-tag")),
            exp: Some(2000),
        };
        // Passing valid aud and future exp
        assert!(validate_jwt_claims(&identity, Some("expected-aud-tag"), 1000).is_ok());
        // Passing with no expected aud configured (just checks non-empty)
        assert!(validate_jwt_claims(&identity, None, 1000).is_ok());
    }

    #[test]
    fn test_validate_jwt_claims_expired() {
        let identity = CloudflareAccessIdentity {
            email: "user@example.com".into(),
            user_uuid: Some("uuid-123".into()),
            sub: None,
            aud: Some(serde_json::json!("expected-aud-tag")),
            exp: Some(500),
        };
        let err = validate_jwt_claims(&identity, None, 1000).unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(msg) if msg.contains("expired")));
    }

    #[test]
    fn test_validate_jwt_claims_missing_exp() {
        let identity = CloudflareAccessIdentity {
            email: "user@example.com".into(),
            user_uuid: Some("uuid-123".into()),
            sub: None,
            aud: Some(serde_json::json!("expected-aud-tag")),
            exp: None,
        };
        let err = validate_jwt_claims(&identity, None, 1000).unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(msg) if msg.contains("missing exp")));
    }

    #[test]
    fn test_validate_jwt_claims_aud_mismatch() {
        let identity = CloudflareAccessIdentity {
            email: "user@example.com".into(),
            user_uuid: Some("uuid-123".into()),
            sub: None,
            aud: Some(serde_json::json!("wrong-aud-tag")),
            exp: Some(2000),
        };
        let err = validate_jwt_claims(&identity, Some("expected-aud-tag"), 1000).unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(msg) if msg.contains("audience mismatch")));
    }

    #[test]
    fn test_validate_jwt_claims_aud_array() {
        let identity = CloudflareAccessIdentity {
            email: "user@example.com".into(),
            user_uuid: Some("uuid-123".into()),
            sub: None,
            aud: Some(serde_json::json!(["aud-1", "expected-aud-tag"])),
            exp: Some(2000),
        };
        assert!(validate_jwt_claims(&identity, Some("expected-aud-tag"), 1000).is_ok());
    }
}
