use super::opt_js;
use crate::models::{CreateRedirectReq, Redirect, UpdateRedirectReq};
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

const REDIRECT_COLUMNS: &str = "id, source_path, target_url, status_code, notes, hit_count, created_at, updated_at";

pub async fn get_all(db: &D1Database) -> Result<Vec<Redirect>> {
    let query = format!("SELECT {REDIRECT_COLUMNS} FROM redirects ORDER BY created_at DESC");
    let statement = db.prepare(&query);
    let result = statement.all().await?;
    result.results::<Redirect>()
}

pub async fn find_by_id(db: &D1Database, id: i64) -> Result<Option<Redirect>> {
    let query = format!("SELECT {REDIRECT_COLUMNS} FROM redirects WHERE id = ?1");
    let statement = db.prepare(&query);
    statement
        .bind(&[JsValue::from(id as f64)])?
        .first::<Redirect>(None)
        .await
}

pub async fn find_by_source_path(db: &D1Database, source_path: &str) -> Result<Option<Redirect>> {
    let normalized = if source_path.starts_with('/') {
        source_path.to_string()
    } else {
        format!("/{}", source_path)
    };
    let query = format!("SELECT {REDIRECT_COLUMNS} FROM redirects WHERE source_path = ?1");
    let statement = db.prepare(&query);
    statement
        .bind(&[normalized.into()])?
        .first::<Redirect>(None)
        .await
}

pub async fn create(db: &D1Database, req: &CreateRedirectReq) -> Result<Redirect> {
    let normalized_source = if req.source_path.starts_with('/') {
        req.source_path.clone()
    } else {
        format!("/{}", req.source_path)
    };

    let query = format!(
        "INSERT INTO redirects (source_path, target_url, status_code, notes, hit_count, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) \
         RETURNING {REDIRECT_COLUMNS}"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[
            normalized_source.into(),
            req.target_url.as_str().into(),
            JsValue::from(req.status_code as f64),
            opt_js(&req.notes),
        ])?
        .first::<Redirect>(None)
        .await?;

    match result {
        Some(r) => Ok(r),
        None => Err(worker::Error::RustError("Failed to insert redirect".into())),
    }
}

pub async fn update(db: &D1Database, id: i64, req: &UpdateRedirectReq) -> Result<Option<Redirect>> {
    let existing = match find_by_id(db, id).await? {
        Some(r) => r,
        None => return Ok(None),
    };

    let new_source = match &req.source_path {
        Some(s) => if s.starts_with('/') { s.clone() } else { format!("/{}", s) },
        None => existing.source_path,
    };
    let new_target = req.target_url.as_deref().unwrap_or(&existing.target_url);
    let new_status = req.status_code.unwrap_or(existing.status_code);
    let new_notes = if req.notes.is_some() {
        req.notes.clone()
    } else {
        existing.notes
    };

    let query = format!(
        "UPDATE redirects SET source_path = ?1, target_url = ?2, status_code = ?3, notes = ?4, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?5 \
         RETURNING {REDIRECT_COLUMNS}"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[
            new_source.into(),
            new_target.into(),
            JsValue::from(new_status as f64),
            opt_js(&new_notes),
            JsValue::from(id as f64),
        ])?
        .first::<Redirect>(None)
        .await?;

    Ok(result)
}

pub async fn delete(db: &D1Database, id: i64) -> Result<bool> {
    let query = "DELETE FROM redirects WHERE id = ?1";
    let statement = db.prepare(query);
    let result = statement.bind(&[JsValue::from(id as f64)])?.run().await?;
    Ok(result.success())
}

pub async fn increment_hit_count(db: &D1Database, id: i64) -> Result<bool> {
    let query = "UPDATE redirects SET hit_count = hit_count + 1 WHERE id = ?1";
    let statement = db.prepare(query);
    let result = statement.bind(&[JsValue::from(id as f64)])?.run().await?;
    Ok(result.success())
}
