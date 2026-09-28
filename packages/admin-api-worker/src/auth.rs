use zygo_core::error::AppError;
use zygo_core::models::User;
use zygo_core::db;
use serde::Deserialize;
use worker::{D1Database, Env, Request};
use base64::Engine;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CloudflareAccessIdentity {
    pub email: String,
    pub user_uuid: Option<String>,
    pub sub: Option<String>,
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

pub async fn require_user(req: &Request, env: &Env, db: &D1Database) -> Result<User, AppError> {
    let is_dev = env.var("ENVIRONMENT").ok().map(|v| v.to_string() == "dev").unwrap_or(false);

    if is_dev {
        // Local Dev Auth Mocking
        return resolve_local_user(env, db, "mock-admin-uuid", Some("admin@localhost".to_string())).await;
    }

    // Extract the Cloudflare Access JWT Assertion header
    let auth_header = req
        .headers()
        .get("Cf-Access-Jwt-Assertion")
        .map_err(|e| AppError::Unauthorized(format!("Failed to read headers: {}", e)))?
        .ok_or_else(|| AppError::Unauthorized("Missing Cf-Access-Jwt-Assertion header".into()))?;

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

    let user_id = identity.user_uuid.or(identity.sub).unwrap_or_else(|| "unknown".to_string());
    resolve_local_user(env, db, &user_id, Some(identity.email)).await
}

async fn resolve_local_user(env: &Env, db: &D1Database, auth_provider_id: &str, email: Option<String>) -> Result<User, AppError> {
    let is_dev = env.var("ENVIRONMENT").ok().map(|v| v.to_string() == "dev").unwrap_or(false);

    if let Ok(Some(mut user)) = db::find_user_by_auth_id(db, auth_provider_id).await {
        if is_dev && auth_provider_id == "mock-admin-uuid" {
            user.role = "admin".into();
        }
        return Ok(user);
    }
    
    // Auto-provision on first login
    let mut user = match db::create_user(db, auth_provider_id, email.clone()).await {
        Ok(u) => u,
        Err(e) => {
            if is_dev && auth_provider_id == "mock-admin-uuid" {
                return Ok(User {
                    id: 1,
                    auth_provider_id: auth_provider_id.to_string(),
                    email,
                    display_name: Some("Local Admin".to_string()),
                    role: "admin".to_string(),
                    created_at: "1970-01-01T00:00:00Z".to_string(),
                    updated_at: "1970-01-01T00:00:00Z".to_string(),
                });
            }
            return Err(AppError::ServerError(format!("Failed to auto-provision user: {}", e)));
        }
    };
        
    if is_dev && auth_provider_id == "mock-admin-uuid" {
        user.role = "admin".into();
    }
    Ok(user)
}
