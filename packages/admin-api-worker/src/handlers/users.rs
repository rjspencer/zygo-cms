use crate::auth_required;
use serde::Deserialize;
use worker::wasm_bindgen::JsValue;
use worker::{Request, Response, Result, RouteContext};
use zygo_core::error::AppError;
use zygo_core::models::User;

fn opt_js(val: &Option<String>) -> JsValue {
    val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct CreateUserRequest {
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: Option<String>,
    pub auth_provider_id: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub avatar_url: Option<String>,
}

impl Default for CreateUserRequest {
    fn default() -> Self {
        Self {
            email: None,
            display_name: None,
            role: None,
            auth_provider_id: None,
            bio: None,
            website: None,
            avatar_url: None,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct UpdateUserRequest {
    pub role: Option<String>,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub avatar_url: Option<String>,
}

impl Default for UpdateUserRequest {
    fn default() -> Self {
        Self {
            role: None,
            display_name: None,
            bio: None,
            website: None,
            avatar_url: None,
        }
    }
}

const USER_COLUMNS: &str = "id, auth_provider_id, email, display_name, role, created_at, updated_at, deleted_at, bio, website, avatar_url";

/// GET /api/admin/users
pub async fn list_users(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    if _user.role != "admin" {
        return AppError::Unauthorized("Admin role required".into()).to_response();
    }

    let db = ctx.env.d1("DB")?;
    let query = format!("SELECT {} FROM users ORDER BY id ASC", USER_COLUMNS);
    let statement = db.prepare(&query);
    let result = statement.all().await?;
    let users = result.results::<User>()?;

    crate::utils::json_response(&users)
}

/// POST /api/admin/users
pub async fn create_user(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    if _user.role != "admin" {
        return AppError::Unauthorized("Admin role required".into()).to_response();
    }

    let payload = match req.json::<CreateUserRequest>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    let email = match payload.email {
        Some(ref e) if !e.trim().is_empty() => e.trim().to_string(),
        _ => return AppError::BadRequest("Email is required".into()).to_response(),
    };

    let auth_provider_id = payload
        .auth_provider_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| email.clone());

    let role = payload
        .role
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "author".to_string());

    let display_name = payload
        .display_name
        .filter(|s| !s.trim().is_empty())
        .or_else(|| email.split('@').next().map(|s| s.to_string()));

    let db = ctx.env.d1("DB")?;

    let check_query = format!("SELECT {} FROM users WHERE email = ?1 OR auth_provider_id = ?2", USER_COLUMNS);
    let existing = db
        .prepare(&check_query)
        .bind(&[opt_js(&Some(email.clone())), auth_provider_id.as_str().into()])?
        .first::<User>(None)
        .await?;

    if existing.is_some() {
        return AppError::BadRequest("A user with this email or auth provider ID already exists".into()).to_response();
    }

    let insert_query = format!(
        "INSERT INTO users (auth_provider_id, email, display_name, role, bio, website, avatar_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING {}",
        USER_COLUMNS
    );

    let statement = db.prepare(&insert_query);
    let created = statement
        .bind(&[
            auth_provider_id.into(),
            opt_js(&Some(email)),
            opt_js(&display_name),
            role.into(),
            opt_js(&payload.bio),
            opt_js(&payload.website),
            opt_js(&payload.avatar_url),
        ])?
        .first::<User>(None)
        .await?;

    match created {
        Some(user) => crate::utils::json_response(&user),
        None => AppError::ServerError("Failed to create user".into()).to_response(),
    }
}

/// PUT /api/admin/users/:id
pub async fn update_user(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    if _user.role != "admin" {
        return AppError::Unauthorized("Admin role required".into()).to_response();
    }

    let id = match ctx.param("id") {
        Some(id) => id,
        None => return AppError::BadRequest("Missing user id".into()).to_response(),
    };

    let payload = match req.json::<UpdateUserRequest>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;

    let find_query = format!("SELECT {} FROM users WHERE id = ?1", USER_COLUMNS);
    let existing = db
        .prepare(&find_query)
        .bind(&[id.into()])?
        .first::<User>(None)
        .await?;

    let existing = match existing {
        Some(u) => u,
        None => return AppError::NotFound.to_response(),
    };

    let role = payload
        .role
        .filter(|r| !r.trim().is_empty())
        .unwrap_or(existing.role);

    let display_name = if let Some(d) = payload.display_name {
        if d.is_empty() { None } else { Some(d) }
    } else {
        existing.display_name
    };

    let bio = if let Some(b) = payload.bio {
        if b.is_empty() { None } else { Some(b) }
    } else {
        existing.bio
    };

    let website = if let Some(w) = payload.website {
        if w.is_empty() { None } else { Some(w) }
    } else {
        existing.website
    };

    let avatar_url = if let Some(a) = payload.avatar_url {
        if a.is_empty() { None } else { Some(a) }
    } else {
        existing.avatar_url
    };

    let update_query = format!(
        "UPDATE users SET role = ?1, display_name = ?2, bio = ?3, website = ?4, avatar_url = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6 RETURNING {}",
        USER_COLUMNS
    );

    let statement = db.prepare(&update_query);
    let updated = statement
        .bind(&[
            role.into(),
            opt_js(&display_name),
            opt_js(&bio),
            opt_js(&website),
            opt_js(&avatar_url),
            id.into(),
        ])?
        .first::<User>(None)
        .await?;

    match updated {
        Some(user) => crate::utils::json_response(&user),
        None => AppError::NotFound.to_response(),
    }
}

/// DELETE /api/admin/users/:id
pub async fn delete_user(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    if _user.role != "admin" {
        return AppError::Unauthorized("Admin role required".into()).to_response();
    }

    let id = match ctx.param("id") {
        Some(id) => id,
        None => return AppError::BadRequest("Missing user id".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;

    let find_query = format!("SELECT {} FROM users WHERE id = ?1", USER_COLUMNS);
    let existing = db
        .prepare(&find_query)
        .bind(&[id.into()])?
        .first::<User>(None)
        .await?;

    if existing.is_none() {
        return AppError::NotFound.to_response();
    }

    let update_query = "UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1";
    db.prepare(update_query).bind(&[id.into()])?.run().await?;

    crate::utils::json_response(&serde_json::json!({ "success": true }))
}
