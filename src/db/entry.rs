use super::opt_js;
use crate::models::{CreateEntryRequest, Entry, UpdateEntryRequest};
use worker::{D1Database, Result};

const ALL_COLUMNS: &str = "id, slug, title, type, status, description, cover_image, canonical_url, schema_json, published_at, body_html, body_json, created_at";

pub async fn find_all_entries(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!("SELECT {ALL_COLUMNS} FROM entries ORDER BY created_at DESC");
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_published_entries(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE status = 'published' ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_published_posts(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_published_post_by_slug(db: &D1Database, slug: &str) -> Result<Option<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND slug = ?1"
    );
    let statement = db.prepare(&query);
    statement.bind(&[slug.into()])?.first::<Entry>(None).await
}

pub async fn find_published_page_by_slug(db: &D1Database, slug: &str) -> Result<Option<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'page' AND status = 'published' AND slug = ?1"
    );
    let statement = db.prepare(&query);
    statement.bind(&[slug.into()])?.first::<Entry>(None).await
}

pub async fn find_entry_by_id(db: &D1Database, id: &str) -> Result<Option<Entry>> {
    let query = format!("SELECT {ALL_COLUMNS} FROM entries WHERE id = ?1");
    let statement = db.prepare(&query);
    statement.bind(&[id.into()])?.first::<Entry>(None).await
}

pub async fn create_entry(db: &D1Database, payload: &CreateEntryRequest) -> Result<()> {
    let statement = db.prepare(
        "INSERT INTO entries (
            slug, title, type, status, description, cover_image, canonical_url, schema_json, published_at, body_html, body_json
         ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
            CASE WHEN ?4 = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
            ?9, ?10
         )",
    );

    let entry_type = payload.r#type.as_deref().unwrap_or("post");
    let status = payload.status.as_deref().unwrap_or("published");

    statement
        .bind(&[
            payload.slug.as_str().into(),
            payload.title.as_str().into(),
            entry_type.into(),
            status.into(),
            opt_js(&payload.description),
            opt_js(&payload.cover_image),
            opt_js(&payload.canonical_url),
            opt_js(&payload.schema_json),
            payload.body_html.as_str().into(),
            payload.body_json.as_str().into(),
        ])?
        .run()
        .await?;

    Ok(())
}

pub async fn update_entry(db: &D1Database, id: &str, payload: &UpdateEntryRequest) -> Result<bool> {
    let statement = db.prepare(
        "UPDATE entries
         SET title = COALESCE(?1, title),
             type = COALESCE(?2, type),
             status = COALESCE(?3, status),
             description = COALESCE(?4, description),
             cover_image = COALESCE(?5, cover_image),
             canonical_url = COALESCE(?6, canonical_url),
             schema_json = COALESCE(?7, schema_json),
             published_at = CASE
                 WHEN COALESCE(?3, status) = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP
                 WHEN COALESCE(?3, status) = 'draft' THEN NULL
                 ELSE published_at
             END,
             body_html = COALESCE(?8, body_html),
             body_json = COALESCE(?9, body_json),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?10",
    );

    let result = statement
        .bind(&[
            opt_js(&payload.title),
            opt_js(&payload.r#type),
            opt_js(&payload.status),
            opt_js(&payload.description),
            opt_js(&payload.cover_image),
            opt_js(&payload.canonical_url),
            opt_js(&payload.schema_json),
            opt_js(&payload.body_html),
            opt_js(&payload.body_json),
            id.into(),
        ])?
        .run()
        .await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn delete_entry(db: &D1Database, id: &str) -> Result<bool> {
    let statement = db.prepare("DELETE FROM entries WHERE id = ?1");
    let result = statement.bind(&[id.into()])?.run().await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}
