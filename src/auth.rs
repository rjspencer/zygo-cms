use crate::error::AppError;
use serde::Deserialize;
use worker::{Env, Fetch, Headers, Method, Request, RequestInit};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PropelAuthUser {
    pub user_id: String,
    pub email: Option<String>,
}

#[macro_export]
macro_rules! auth_required {
    ($req:expr, $ctx:expr) => {
        match $crate::auth::require_user($req, &$ctx.env).await {
            Ok(user) => user,
            Err(err) => return err.to_response(),
        }
    };
}

pub async fn require_user(req: &Request, env: &Env) -> Result<PropelAuthUser, AppError> {
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
        return Ok(PropelAuthUser {
            user_id: "test-user-id".into(),
            email: Some("admin@zygo.dev".into()),
        });
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

    // 4. Validate token with PropelAuth at the edge
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

    if res.status_code() != 200 {
        return Err(AppError::Unauthorized(
            "Invalid or expired authentication token".into(),
        ));
    }

    let user = res
        .json::<PropelAuthUser>()
        .await
        .map_err(|_| AppError::Unauthorized("Invalid user response from auth provider".into()))?;

    Ok(user)
}
