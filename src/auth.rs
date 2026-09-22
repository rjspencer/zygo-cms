use crate::error::AppError;
use crate::models::User;
use crate::db;
use serde::Deserialize;
use worker::{D1Database, Env, Fetch, Headers, Method, Request, RequestInit};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PropelAuthUser {
    pub user_id: String,
    pub email: Option<String>,
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
    // 1. Extract the Authorization header
    let auth_header = req
        .headers()
        .get("Authorization")
        .map_err(|e| AppError::Unauthorized(format!("Failed to read headers: {}", e)))?
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

    // 2. Ensure it starts with "Bearer "
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Invalid Bearer token format".into()))?;

    // Test bypass for integration testing when explicitly enabled
    if env
        .var("TEST_AUTH_BYPASS")
        .ok()
        .map(|v| v.to_string() == "true")
        .unwrap_or(false)
        && token == "test-token"
    {
        let test_user_id = "test-user-id";
        let test_email = Some("admin@zygo.dev".to_string());
        return resolve_local_user(db, test_user_id, test_email).await;
    }

    // 3. Read the Auth URL from wrangler environment vars
    let auth_url = env
        .var("PROPELAUTH_AUTH_URL")
        .map_err(|_| AppError::Unauthorized("PROPELAUTH_AUTH_URL not configured".into()))?
        .to_string();

    let userinfo_url = format!(
        "{}/propelauth/oauth/userinfo",
        auth_url.trim_end_matches('/')
    );

    // 4. Validate token with PropelAuth at the edge (Try OAuth Access Token first)
    let headers = Headers::new();
    headers
        .set("Authorization", &format!("Bearer {}", token))
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let verify_req = Request::new_with_init(&userinfo_url, &init)
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;

    let mut res = Fetch::Request(verify_req)
        .send()
        .await
        .map_err(|e| AppError::Unauthorized(format!("Auth verification failed: {}", e)))?;

    if res.status_code() == 200 {
        let user = res
            .json::<PropelAuthUser>()
            .await
            .map_err(|_| AppError::Unauthorized("Invalid user response from auth provider".into()))?;
        return resolve_local_user(db, &user.user_id, user.email).await;
    }

    // 5. If OAuth fails, try Personal API Key validation (if integration key is configured)
    if let Ok(integration_key) = env.var("PROPELAUTH_API_KEY") {
        let pak_url = format!(
            "{}/api/backend/v1/personal_api_keys/validate",
            auth_url.trim_end_matches('/')
        );
        
        let pak_headers = Headers::new();
        pak_headers
            .set("Authorization", &format!("Bearer {}", integration_key.to_string()))
            .map_err(|e| AppError::Unauthorized(e.to_string()))?;
        pak_headers
            .set("Content-Type", "application/json")
            .map_err(|e| AppError::Unauthorized(e.to_string()))?;

        let mut pak_init = RequestInit::new();
        pak_init.with_method(Method::Post);
        pak_init.with_headers(pak_headers);
        pak_init.with_body(Some(serde_json::json!({ "personal_api_key": token }).to_string().into()));

        let pak_req = Request::new_with_init(&pak_url, &pak_init)
            .map_err(|e| AppError::Unauthorized(e.to_string()))?;

        let mut pak_res = Fetch::Request(pak_req)
            .send()
            .await
            .map_err(|e| AppError::Unauthorized(format!("API Key verification failed: {}", e)))?;

        if pak_res.status_code() == 200 {
            #[derive(Deserialize)]
            struct PakResponse {
                user: PropelAuthUser,
            }
            let data = pak_res
                .json::<PakResponse>()
                .await
                .map_err(|_| AppError::Unauthorized("Invalid PAK response from auth provider".into()))?;
            return resolve_local_user(db, &data.user.user_id, data.user.email).await;
        }
    }

    Err(AppError::Unauthorized(
        "Invalid or expired authentication token / API Key".into(),
    ))
}

async fn resolve_local_user(db: &D1Database, auth_provider_id: &str, email: Option<String>) -> Result<User, AppError> {
    if let Ok(Some(user)) = db::find_user_by_auth_id(db, auth_provider_id).await {
        return Ok(user);
    }
    
    // Auto-provision on first login
    db::create_user(db, auth_provider_id, email)
        .await
        .map_err(|e| AppError::ServerError(format!("Failed to auto-provision user: {}", e)))
}
