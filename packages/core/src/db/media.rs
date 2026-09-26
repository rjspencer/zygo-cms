use crate::models::MediaItem;
use std::collections::HashSet;
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

#[derive(serde::Deserialize)]
struct CountResult {
    count: i64,
}

#[derive(serde::Deserialize)]
struct KeyRow {
    key: String,
}

/// Insert or update a media metadata entry in D1
pub async fn insert_media(
    db: &D1Database,
    key: &str,
    filename: &str,
    mime_type: &str,
    size_bytes: i64,
) -> Result<()> {
    let statement = db
        .prepare(
            "INSERT INTO media (key, filename, mime_type, size_bytes)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(key) DO UPDATE SET
                 filename = excluded.filename,
                 mime_type = excluded.mime_type,
                 size_bytes = excluded.size_bytes",
        )
        .bind(&[
            JsValue::from(key),
            JsValue::from(filename),
            JsValue::from(mime_type),
            JsValue::from(size_bytes as f64),
        ])?;
    statement.run().await?;
    Ok(())
}

/// Delete a media entry by its storage key
pub async fn delete_media_by_key(db: &D1Database, key: &str) -> Result<bool> {
    let statement = db
        .prepare("DELETE FROM media WHERE key = ?1")
        .bind(&[JsValue::from(key)])?;
    let res = statement.run().await?;
    Ok(res.success())
}

/// Find a single media record by key
#[allow(dead_code)]
pub async fn find_media_by_key(db: &D1Database, key: &str) -> Result<Option<MediaItem>> {
    let statement = db
        .prepare(
            "SELECT id, key, filename, mime_type, size_bytes, created_at FROM media WHERE key = ?1",
        )
        .bind(&[JsValue::from(key)])?;
    statement.first::<MediaItem>(None).await
}

/// Count total media items matching optional filename search filter
pub async fn count_media(db: &D1Database, search: Option<&str>) -> Result<i64> {
    let count_res = match search.filter(|s| !s.trim().is_empty()) {
        Some(term) => {
            let pattern = format!("%{}%", term.trim());
            db.prepare("SELECT COUNT(*) as count FROM media WHERE filename LIKE ?1")
                .bind(&[JsValue::from(pattern)])?
                .first::<CountResult>(None)
                .await?
        }
        None => {
            db.prepare("SELECT COUNT(*) as count FROM media")
                .first::<CountResult>(None)
                .await?
        }
    };
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

/// Query paginated media items with optional filename search and sorting
pub async fn find_media_paginated(
    db: &D1Database,
    search: Option<&str>,
    sort: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<MediaItem>> {
    let order_clause = match sort.unwrap_or("newest") {
        "oldest" => "ORDER BY created_at ASC, id ASC",
        "name_asc" => "ORDER BY filename COLLATE NOCASE ASC",
        "name_desc" => "ORDER BY filename COLLATE NOCASE DESC",
        "size_desc" => "ORDER BY size_bytes DESC",
        "size_asc" => "ORDER BY size_bytes ASC",
        _ => "ORDER BY created_at DESC, id DESC",
    };

    let statement = match search.filter(|s| !s.trim().is_empty()) {
        Some(term) => {
            let pattern = format!("%{}%", term.trim());
            let query = format!(
                "SELECT id, key, filename, mime_type, size_bytes, created_at FROM media WHERE filename LIKE ?1 {order_clause} LIMIT ?2 OFFSET ?3"
            );
            db.prepare(&query).bind(&[
                JsValue::from(pattern),
                JsValue::from(limit as f64),
                JsValue::from(offset as f64),
            ])?
        }
        None => {
            let query = format!(
                "SELECT id, key, filename, mime_type, size_bytes, created_at FROM media {order_clause} LIMIT ?1 OFFSET ?2"
            );
            db.prepare(&query)
                .bind(&[JsValue::from(limit as f64), JsValue::from(offset as f64)])?
        }
    };
    let result = statement.run().await?;
    result.results::<MediaItem>()
}

/// Retrieve all media keys currently stored in D1 for diffing with R2
pub async fn find_all_media_keys(db: &D1Database) -> Result<HashSet<String>> {
    let statement = db.prepare("SELECT key FROM media");
    let result = statement.run().await?;
    let rows = result.results::<KeyRow>()?;
    Ok(rows.into_iter().map(|r| r.key).collect())
}
