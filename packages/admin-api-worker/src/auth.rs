use zygo_core::error::AppError;
use zygo_core::models::User;
use zygo_core::db;
use serde::Deserialize;
use worker::{D1Database, Env, Request};
use base64::Engine;
use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Debug, Default, Deserialize)]
#[allow(dead_code)]
pub struct CloudflareAccessIdentity {
    pub email: String,
    pub user_uuid: Option<String>,
    pub sub: Option<String>,
    pub aud: Option<serde_json::Value>,
    pub exp: Option<u64>,
    pub nbf: Option<u64>,
    pub iss: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct JwtHeader {
    pub alg: String,
    pub kid: Option<String>,
    #[serde(rename = "typ")]
    pub typ: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct JwkKey {
    pub kid: String,
    pub kty: String,
    pub alg: Option<String>,
    pub n: String,
    pub e: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwksResponse {
    #[serde(default)]
    pub keys: Vec<JwkKey>,
}

struct CachedJwks {
    keys: HashMap<String, rsa::RsaPublicKey>,
    fetched_at: u64,
}

static JWKS_CACHE: Mutex<Option<CachedJwks>> = Mutex::new(None);
const JWKS_CACHE_TTL_SECS: u64 = 3600; // 1 hour TTL
const JWKS_REFETCH_THROTTLE_SECS: u64 = 60; // Rate-limit JWKS network refetches

#[cfg(test)]
pub fn set_cached_jwk(kid: &str, key: rsa::RsaPublicKey) {
    let mut guard = JWKS_CACHE.lock().unwrap();
    let cache = guard.get_or_insert_with(|| CachedJwks {
        keys: HashMap::new(),
        fetched_at: current_epoch_seconds(),
    });
    cache.keys.insert(kid.to_string(), key);
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

fn base64_url_decode(s: &str) -> Result<Vec<u8>, AppError> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s.as_bytes())
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(s.as_bytes()))
        .map_err(|e| AppError::Unauthorized(format!("Invalid base64 encoding: {}", e)))
}

fn parse_jwk_to_rsa_public_key(jwk: &JwkKey) -> Result<rsa::RsaPublicKey, AppError> {
    if jwk.kty != "RSA" {
        return Err(AppError::Unauthorized("JWK is not an RSA key".into()));
    }
    let n_bytes = base64_url_decode(&jwk.n)?;
    let e_bytes = base64_url_decode(&jwk.e)?;
    let n = rsa::BigUint::from_bytes_be(&n_bytes);
    let e = rsa::BigUint::from_bytes_be(&e_bytes);
    rsa::RsaPublicKey::new(n, e)
        .map_err(|err| AppError::Unauthorized(format!("Invalid RSA public key parameters: {}", err)))
}

fn validate_issuer(iss: &str, configured_team_domain: Option<&str>) -> Result<(), AppError> {
    let parsed_url = worker::Url::parse(iss)
        .map_err(|_| AppError::Unauthorized("Invalid JWT issuer URL".into()))?;

    if parsed_url.scheme() != "https" {
        return Err(AppError::Unauthorized("JWT issuer must use HTTPS".into()));
    }

    let host = parsed_url
        .host_str()
        .ok_or_else(|| AppError::Unauthorized("JWT issuer missing host".into()))?;

    if let Some(expected_domain) = configured_team_domain {
        let expected_clean = expected_domain
            .trim_start_matches("https://")
            .trim_start_matches("http://")
            .trim_end_matches('/');
        if !expected_clean.is_empty() && host != expected_clean {
            return Err(AppError::Unauthorized(format!(
                "JWT issuer domain mismatch: expected {}, got {}",
                expected_clean, host
            )));
        }
    }

    // Enforce that the host strictly ends with .cloudflareaccess.com to prevent SSRF
    if !host.ends_with(".cloudflareaccess.com") {
        return Err(AppError::Unauthorized(
            "JWT issuer is not a trusted Cloudflare Access domain".into(),
        ));
    }

    Ok(())
}

async fn get_public_key_for_kid(kid: &str, iss: &str) -> Result<rsa::RsaPublicKey, AppError> {
    let now = current_epoch_seconds();

    // 1. Check in-memory cache
    if let Ok(guard) = JWKS_CACHE.lock() {
        if let Some(cache) = guard.as_ref() {
            if now.saturating_sub(cache.fetched_at) < JWKS_CACHE_TTL_SECS {
                if let Some(key) = cache.keys.get(kid) {
                    return Ok(key.clone());
                }
            }
        }
    }

    // 2. Throttle repeated network refetches on invalid kid to mitigate DoS
    if let Ok(guard) = JWKS_CACHE.lock() {
        if let Some(cache) = guard.as_ref() {
            if now.saturating_sub(cache.fetched_at) < JWKS_REFETCH_THROTTLE_SECS {
                return Err(AppError::Unauthorized(format!("Unknown JWT Key ID (kid): {}", kid)));
            }
        }
    }

    // 3. Fetch from Cloudflare Access certs endpoint
    let certs_url = format!("{}/cdn-cgi/access/certs", iss.trim_end_matches('/'));
    let url = worker::Url::parse(&certs_url)
        .map_err(|e| AppError::Unauthorized(format!("Invalid JWKS URL: {}", e)))?;

    let req = worker::Request::new(url.as_str(), worker::Method::Get)
        .map_err(|e| AppError::Unauthorized(format!("Failed to build JWKS request: {}", e)))?;
    let mut resp = worker::Fetch::Request(req)
        .send()
        .await
        .map_err(|e| AppError::Unauthorized(format!("Failed to fetch JWKS: {}", e)))?;

    if resp.status_code() != 200 {
        return Err(AppError::Unauthorized(format!(
            "JWKS endpoint returned status {}",
            resp.status_code()
        )));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| AppError::Unauthorized(format!("Failed to read JWKS response: {}", e)))?;
    let jwks: JwksResponse = serde_json::from_str(&body)
        .map_err(|e| AppError::Unauthorized(format!("Failed to parse JWKS JSON: {}", e)))?;

    let mut new_keys = HashMap::new();
    for key in jwks.keys {
        if let Ok(parsed) = parse_jwk_to_rsa_public_key(&key) {
            new_keys.insert(key.kid, parsed);
        }
    }

    let target_key = new_keys.get(kid).cloned();

    if let Ok(mut guard) = JWKS_CACHE.lock() {
        *guard = Some(CachedJwks {
            keys: new_keys,
            fetched_at: now,
        });
    }

    target_key.ok_or_else(|| AppError::Unauthorized(format!("JWT Key ID (kid) not found in JWKS: {}", kid)))
}

pub async fn verify_cloudflare_jwt(
    auth_header: &str,
    env: &Env,
    now_secs: u64,
) -> Result<CloudflareAccessIdentity, AppError> {
    let expected_aud = env
        .var("CF_ACCESS_AUD")
        .or_else(|_| env.var("POLICY_AUD"))
        .ok()
        .map(|v| v.to_string())
        .filter(|s| !s.trim().is_empty());
    let configured_team = env
        .var("CF_ACCESS_TEAM_DOMAIN")
        .ok()
        .map(|v| v.to_string())
        .filter(|s| !s.trim().is_empty());

    verify_cloudflare_jwt_with_config(
        auth_header,
        expected_aud.as_deref(),
        configured_team.as_deref(),
        now_secs,
    )
    .await
}

pub async fn verify_cloudflare_jwt_with_config(
    auth_header: &str,
    expected_aud: Option<&str>,
    configured_team_domain: Option<&str>,
    now_secs: u64,
) -> Result<CloudflareAccessIdentity, AppError> {
    let parts: Vec<&str> = auth_header.split('.').collect();
    if parts.len() != 3 {
        return Err(AppError::Unauthorized("Invalid JWT format".into()));
    }

    let header_b64 = parts[0];
    let payload_b64 = parts[1];
    let signature_b64 = parts[2];

    // 1. Decode & validate JWT Header
    let header_bytes = base64_url_decode(header_b64)?;
    let header: JwtHeader = serde_json::from_slice(&header_bytes)
        .map_err(|_| AppError::Unauthorized("Invalid JWT header".into()))?;

    if header.alg != "RS256" {
        return Err(AppError::Unauthorized(format!(
            "Unsupported JWT algorithm: {}",
            header.alg
        )));
    }

    let kid = header
        .kid
        .as_deref()
        .ok_or_else(|| AppError::Unauthorized("JWT header missing 'kid'".into()))?;
    if kid.trim().is_empty() {
        return Err(AppError::Unauthorized("JWT header 'kid' cannot be empty".into()));
    }

    // 2. Decode & validate JWT Payload claims
    let payload_bytes = base64_url_decode(payload_b64)?;
    let identity: CloudflareAccessIdentity = serde_json::from_slice(&payload_bytes)
        .map_err(|_| AppError::Unauthorized("Invalid JWT payload".into()))?;

    validate_jwt_claims(&identity, expected_aud, now_secs)?;

    // 3. Validate issuer URL format and domain
    let iss = identity
        .iss
        .as_deref()
        .ok_or_else(|| AppError::Unauthorized("JWT missing 'iss' claim".into()))?;
    validate_issuer(iss, configured_team_domain)?;

    // 4. Retrieve public key and cryptographically verify signature
    let public_key = get_public_key_for_kid(kid, iss).await?;

    let signed_content = format!("{}.{}", header_b64, payload_b64);
    let signature_bytes = base64_url_decode(signature_b64)?;

    let verifying_key = rsa::pkcs1v15::VerifyingKey::<sha2::Sha256>::new(public_key);
    let signature = rsa::pkcs1v15::Signature::try_from(signature_bytes.as_slice())
        .map_err(|_| AppError::Unauthorized("Invalid RSA signature format".into()))?;

    use rsa::signature::Verifier;
    verifying_key
        .verify(signed_content.as_bytes(), &signature)
        .map_err(|_| AppError::Unauthorized("Invalid JWT signature".into()))?;

    Ok(identity)
}

fn validate_jwt_claims(
    identity: &CloudflareAccessIdentity,
    expected_aud: Option<&str>,
    now_secs: u64,
) -> Result<(), AppError> {
    // Basic validation for exp claim with 30s clock skew tolerance
    let exp = identity
        .exp
        .ok_or_else(|| AppError::Unauthorized("JWT missing exp claim".into()))?;
    if now_secs.saturating_sub(30) > exp {
        return Err(AppError::Unauthorized("JWT has expired".into()));
    }

    if let Some(nbf) = identity.nbf {
        if now_secs + 30 < nbf {
            return Err(AppError::Unauthorized("JWT is not yet valid (nbf)".into()));
        }
    }

    // Basic validation for aud claim
    let aud_val = identity
        .aud
        .as_ref()
        .ok_or_else(|| AppError::Unauthorized("JWT missing aud claim".into()))?;
    if let Some(expected_str) = expected_aud {
        let trimmed_expected = expected_str.trim();
        if !trimmed_expected.is_empty() {
            let matches = match aud_val {
                serde_json::Value::String(s) => s == trimmed_expected,
                serde_json::Value::Array(arr) => arr.iter().any(|v| v.as_str() == Some(trimmed_expected)),
                _ => false,
            };
            if !matches {
                return Err(AppError::Unauthorized("JWT audience mismatch".into()));
            }
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

fn decode_test_jwt(
    auth_header: &str,
    env: &Env,
    now_secs: u64,
) -> Result<CloudflareAccessIdentity, AppError> {
    let parts: Vec<&str> = auth_header.split('.').collect();
    if parts.len() != 3 {
        return Err(AppError::Unauthorized("Invalid JWT format".into()));
    }
    let payload_bytes = base64_url_decode(parts[1])?;
    let identity: CloudflareAccessIdentity = serde_json::from_slice(&payload_bytes)
        .map_err(|_| AppError::Unauthorized("Invalid JWT payload".into()))?;

    let expected_aud = env
        .var("CF_ACCESS_AUD")
        .or_else(|_| env.var("POLICY_AUD"))
        .ok()
        .map(|v| v.to_string())
        .filter(|s| !s.trim().is_empty());

    validate_jwt_claims(&identity, expected_aud.as_deref(), now_secs)?;

    Ok(identity)
}

pub async fn require_user(req: &Request, env: &Env, db: &D1Database) -> Result<User, AppError> {
    let env_str = env.var("ENVIRONMENT").ok().map(|v| v.to_string());
    let is_dev = env_str.as_deref() == Some("dev");
    let is_test = env_str.as_deref() == Some("test");

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
            let identity = if is_test {
                decode_test_jwt(&auth_header, env, current_epoch_seconds())?
            } else {
                verify_cloudflare_jwt(&auth_header, env, current_epoch_seconds()).await?
            };
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
        if user.deleted_at.is_some() && !is_admin_override {
            return Err(AppError::Unauthorized("User account is suspended".into()));
        }
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
                    ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
        };
        assert!(validate_jwt_claims(&identity, Some("expected-aud-tag"), 1000).is_ok());
    }

    #[test]
    fn test_validate_issuer_trusted() {
        assert!(validate_issuer("https://team.cloudflareaccess.com", None).is_ok());
        assert!(validate_issuer("https://myteam.cloudflareaccess.com", Some("myteam.cloudflareaccess.com")).is_ok());
        assert!(validate_issuer("https://myteam.cloudflareaccess.com", Some("https://myteam.cloudflareaccess.com")).is_ok());
    }

    #[test]
    fn test_validate_issuer_untrusted() {
        // Plain HTTP rejected
        assert!(validate_issuer("http://team.cloudflareaccess.com", None).is_err());
        // Non-cloudflare domain rejected (SSRF protection)
        assert!(validate_issuer("https://evil.com", None).is_err());
        assert!(validate_issuer("https://attacker.cloudflareaccess.com.evil.com", None).is_err());
        // Team mismatch rejected
        assert!(validate_issuer("https://other.cloudflareaccess.com", Some("expected.cloudflareaccess.com")).is_err());
    }

    fn block_on_immediate<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        const VTABLE: RawWakerVTable = RawWakerVTable::new(
            |ptr| RawWaker::new(ptr, &VTABLE),
            |_| (),
            |_| (),
            |_| (),
        );
        let raw_waker = RawWaker::new(std::ptr::null(), &VTABLE);
        let waker = unsafe { Waker::from_raw(raw_waker) };
        let mut cx = Context::from_waker(&waker);
        let mut pinned = unsafe { std::pin::Pin::new_unchecked(&mut fut) };
        match pinned.as_mut().poll(&mut cx) {
            Poll::Ready(res) => res,
            Poll::Pending => panic!("Future did not complete immediately"),
        }
    }

    fn make_test_jwt(
        header: &serde_json::Value,
        payload: &serde_json::Value,
        priv_key: Option<&rsa::RsaPrivateKey>,
    ) -> String {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        use rsa::pkcs1v15::SigningKey;
        use rsa::signature::{SignatureEncoding, Signer};

        let h_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(header).unwrap());
        let p_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(payload).unwrap());
        let signing_input = format!("{}.{}", h_b64, p_b64);

        let sig_b64 = if let Some(key) = priv_key {
            let signing_key = SigningKey::<sha2::Sha256>::new(key.clone());
            let sig = signing_key.sign(signing_input.as_bytes());
            URL_SAFE_NO_PAD.encode(sig.to_vec())
        } else {
            URL_SAFE_NO_PAD.encode("fake_invalid_signature")
        };

        format!("{}.{}", signing_input, sig_b64)
    }

    #[test]
    fn test_verify_cloudflare_jwt_valid_rs256_signature() {
        let mut rng = rand::thread_rng();
        let priv_key = rsa::RsaPrivateKey::new(&mut rng, 2048).unwrap();
        let pub_key = rsa::RsaPublicKey::from(&priv_key);
        let kid = "valid-kid-1";
        set_cached_jwk(kid, pub_key);

        let header = serde_json::json!({
            "alg": "RS256",
            "kid": kid,
            "typ": "JWT"
        });
        let payload = serde_json::json!({
            "email": "verified-admin@example.com",
            "sub": "user-uuid-123",
            "aud": "test-aud-tag",
            "iss": "https://myteam.cloudflareaccess.com",
            "exp": 2000
        });

        let token = make_test_jwt(&header, &payload, Some(&priv_key));
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(
            &token,
            Some("test-aud-tag"),
            Some("https://myteam.cloudflareaccess.com"),
            1000,
        ));

        assert!(res.is_ok());
        let identity = res.unwrap();
        assert_eq!(identity.email, "verified-admin@example.com");
    }

    #[test]
    fn test_verify_cloudflare_jwt_tampered_payload_rejected() {
        let mut rng = rand::thread_rng();
        let priv_key = rsa::RsaPrivateKey::new(&mut rng, 2048).unwrap();
        let pub_key = rsa::RsaPublicKey::from(&priv_key);
        let kid = "tamper-kid";
        set_cached_jwk(kid, pub_key);

        let header = serde_json::json!({ "alg": "RS256", "kid": kid });
        let original_payload = serde_json::json!({
            "email": "original@example.com",
            "aud": "test-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 2000
        });

        let valid_token = make_test_jwt(&header, &original_payload, Some(&priv_key));
        let parts: Vec<&str> = valid_token.split('.').collect();

        // Tamper with payload by changing email to attacker@evil.com
        let tampered_payload = serde_json::json!({
            "email": "attacker@evil.com",
            "aud": "test-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 2000
        });
        let tampered_p_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(serde_json::to_vec(&tampered_payload).unwrap());

        // Reassemble with original signature
        let forged_token = format!("{}.{}.{}", parts[0], tampered_p_b64, parts[2]);

        let res = block_on_immediate(verify_cloudflare_jwt_with_config(
            &forged_token,
            Some("test-aud"),
            None,
            1000,
        ));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("signature")));
    }

    #[test]
    fn test_verify_cloudflare_jwt_unsupported_alg_rejected() {
        let header = serde_json::json!({ "alg": "HS256", "kid": "kid-1" });
        let payload = serde_json::json!({
            "email": "admin@example.com",
            "aud": "test-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 2000
        });

        let token = make_test_jwt(&header, &payload, None);
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(&token, None, None, 1000));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("Unsupported JWT algorithm")));
    }

    #[test]
    fn test_verify_cloudflare_jwt_missing_kid_rejected() {
        let header = serde_json::json!({ "alg": "RS256" }); // missing kid
        let payload = serde_json::json!({
            "email": "admin@example.com",
            "aud": "test-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 2000
        });

        let token = make_test_jwt(&header, &payload, None);
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(&token, None, None, 1000));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("missing 'kid'")));
    }

    #[test]
    fn test_verify_cloudflare_jwt_untrusted_issuer_rejected() {
        let mut rng = rand::thread_rng();
        let priv_key = rsa::RsaPrivateKey::new(&mut rng, 2048).unwrap();
        let pub_key = rsa::RsaPublicKey::from(&priv_key);
        let kid = "kid-rogue";
        set_cached_jwk(kid, pub_key);

        let header = serde_json::json!({ "alg": "RS256", "kid": kid });
        let payload = serde_json::json!({
            "email": "admin@example.com",
            "aud": "test-aud",
            "iss": "https://evil.attacker.com", // untrusted issuer
            "exp": 2000
        });

        let token = make_test_jwt(&header, &payload, Some(&priv_key));
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(&token, None, None, 1000));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("not a trusted Cloudflare Access domain")));
    }

    #[test]
    fn test_verify_cloudflare_jwt_expired_token_rejected() {
        let mut rng = rand::thread_rng();
        let priv_key = rsa::RsaPrivateKey::new(&mut rng, 2048).unwrap();
        let pub_key = rsa::RsaPublicKey::from(&priv_key);
        let kid = "kid-expired";
        set_cached_jwk(kid, pub_key);

        let header = serde_json::json!({ "alg": "RS256", "kid": kid });
        let payload = serde_json::json!({
            "email": "admin@example.com",
            "aud": "test-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 500 // expired
        });

        let token = make_test_jwt(&header, &payload, Some(&priv_key));
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(&token, None, None, 1000));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("expired")));
    }

    #[test]
    fn test_verify_cloudflare_jwt_aud_mismatch_rejected() {
        let mut rng = rand::thread_rng();
        let priv_key = rsa::RsaPrivateKey::new(&mut rng, 2048).unwrap();
        let pub_key = rsa::RsaPublicKey::from(&priv_key);
        let kid = "kid-aud";
        set_cached_jwk(kid, pub_key);

        let header = serde_json::json!({ "alg": "RS256", "kid": kid });
        let payload = serde_json::json!({
            "email": "admin@example.com",
            "aud": "wrong-aud",
            "iss": "https://team.cloudflareaccess.com",
            "exp": 2000
        });

        let token = make_test_jwt(&header, &payload, Some(&priv_key));
        let res = block_on_immediate(verify_cloudflare_jwt_with_config(&token, Some("expected-aud"), None, 1000));

        assert!(res.is_err());
        assert!(matches!(res.unwrap_err(), AppError::Unauthorized(msg) if msg.contains("audience mismatch")));
    }
}
