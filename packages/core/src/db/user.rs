use crate::models::User;
use worker::{D1Database, Result};
use super::opt_js;

pub async fn find_user_by_auth_id(db: &D1Database, auth_provider_id: &str) -> Result<Option<User>> {
    let query = "SELECT id, auth_provider_id, email, display_name, role, created_at, updated_at FROM users WHERE auth_provider_id = ?1";
    let statement = db.prepare(query);
    statement.bind(&[auth_provider_id.into()])?.first::<User>(None).await
}

#[derive(serde::Deserialize)]
struct CountResult {
    count: i64,
}

pub async fn count_users(db: &D1Database) -> Result<i64> {
    let query = "SELECT COUNT(*) as count FROM users";
    let statement = db.prepare(query);
    let count_res = statement.first::<CountResult>(None).await?;
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

pub async fn create_user(db: &D1Database, auth_provider_id: &str, email: Option<String>) -> Result<User> {
    // Check if this is the first user
    let count_stmt = db.prepare("SELECT COUNT(*) as count FROM users");
    let count_res = count_stmt.first::<CountResult>(None).await?;
    let is_first = count_res.map(|c| c.count == 0).unwrap_or(true);
    
    let role = if is_first { "admin" } else { "author" };
    let display_name = email.as_ref().map(|e| e.split('@').next().unwrap_or("").to_string());

    let statement = db.prepare(
        "INSERT INTO users (auth_provider_id, email, display_name, role) VALUES (?1, ?2, ?3, ?4) RETURNING id, auth_provider_id, email, display_name, role, created_at, updated_at"
    );

    let result = statement
        .bind(&[
            auth_provider_id.into(),
            opt_js(&email),
            opt_js(&display_name),
            role.into(),
        ])?
        .first::<User>(None)
        .await?;

    result.ok_or_else(|| worker::Error::RustError("Failed to create user".into()))
}
