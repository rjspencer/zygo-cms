use super::{opt_js, opt_js_i32, opt_js_i64};
use crate::models::{BreadcrumbItem, CreateEntryRequest, Entry, UpdateEntryRequest};
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

const LIST_COLUMNS: &str = "id, slug, title, type, status, description, cover_image, canonical_url, schema_json, category, tags, published_at, created_at, parent_id, path, sort_order, deleted_at, author_id";
const ALL_COLUMNS: &str = "id, slug, title, type, status, description, cover_image, canonical_url, schema_json, category, tags, published_at, body_html, body_json, created_at, parent_id, path, sort_order, deleted_at, author_id";

#[derive(serde::Deserialize)]
struct CountResult {
    count: i64,
}

pub async fn find_all_entries(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_deleted_entries(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

#[allow(dead_code)]
pub async fn count_deleted_entries(db: &D1Database) -> Result<i64> {
    let query = "SELECT COUNT(*) as count FROM entries WHERE deleted_at IS NOT NULL";
    let statement = db.prepare(query);
    let count_res = statement.first::<CountResult>(None).await?;
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

pub async fn find_all_pages(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'page' AND deleted_at IS NULL ORDER BY sort_order ASC, title COLLATE NOCASE ASC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_published_entries(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE status = 'published' AND deleted_at IS NULL ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn find_published_posts(db: &D1Database) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<Entry>()
}

pub async fn count_published_posts(db: &D1Database) -> Result<i64> {
    let query = "SELECT COUNT(*) as count FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL";
    let statement = db.prepare(query);
    let count_res = statement.first::<CountResult>(None).await?;
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

pub async fn find_published_posts_paginated(
    db: &D1Database,
    limit: i64,
    offset: i64,
) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL ORDER BY published_at DESC, created_at DESC LIMIT ?1 OFFSET ?2"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[JsValue::from(limit as f64), JsValue::from(offset as f64)])?
        .run()
        .await?;
    result.results::<Entry>()
}

#[allow(dead_code)]
pub async fn find_published_posts_by_tag(db: &D1Database, tag: &str) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND (',' || REPLACE(LOWER(tags), ' ', '') || ',') LIKE ('%,' || LOWER(?1) || ',%') ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.bind(&[tag.trim().into()])?.run().await?;
    result.results::<Entry>()
}

pub async fn count_published_posts_by_tag(db: &D1Database, tag: &str) -> Result<i64> {
    let query = "SELECT COUNT(*) as count FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND (',' || REPLACE(LOWER(tags), ' ', '') || ',') LIKE ('%,' || LOWER(?1) || ',%')";
    let statement = db.prepare(query);
    let count_res = statement
        .bind(&[tag.trim().into()])?
        .first::<CountResult>(None)
        .await?;
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

pub async fn find_published_posts_by_tag_paginated(
    db: &D1Database,
    tag: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND (',' || REPLACE(LOWER(tags), ' ', '') || ',') LIKE ('%,' || LOWER(?1) || ',%') ORDER BY published_at DESC, created_at DESC LIMIT ?2 OFFSET ?3"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[
            tag.trim().into(),
            JsValue::from(limit as f64),
            JsValue::from(offset as f64),
        ])?
        .run()
        .await?;
    result.results::<Entry>()
}

#[allow(dead_code)]
pub async fn find_published_posts_by_category(
    db: &D1Database,
    category: &str,
) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND LOWER(TRIM(category)) = LOWER(TRIM(?1)) ORDER BY published_at DESC, created_at DESC"
    );
    let statement = db.prepare(&query);
    let result = statement.bind(&[category.trim().into()])?.run().await?;
    result.results::<Entry>()
}

pub async fn count_published_posts_by_category(db: &D1Database, category: &str) -> Result<i64> {
    let query = "SELECT COUNT(*) as count FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND LOWER(TRIM(category)) = LOWER(TRIM(?1))";
    let statement = db.prepare(query);
    let count_res = statement
        .bind(&[category.trim().into()])?
        .first::<CountResult>(None)
        .await?;
    Ok(count_res.map(|c| c.count).unwrap_or(0))
}

pub async fn find_published_posts_by_category_paginated(
    db: &D1Database,
    category: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND LOWER(TRIM(category)) = LOWER(TRIM(?1)) ORDER BY published_at DESC, created_at DESC LIMIT ?2 OFFSET ?3"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[
            category.trim().into(),
            JsValue::from(limit as f64),
            JsValue::from(offset as f64),
        ])?
        .run()
        .await?;
    result.results::<Entry>()
}

pub async fn find_published_post_by_slug(db: &D1Database, slug: &str) -> Result<Option<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'post' AND status = 'published' AND deleted_at IS NULL AND slug = ?1"
    );
    let statement = db.prepare(&query);
    statement.bind(&[slug.into()])?.first::<Entry>(None).await
}

#[allow(dead_code)]
pub async fn find_published_page_by_slug(db: &D1Database, slug: &str) -> Result<Option<Entry>> {
    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'page' AND status = 'published' AND deleted_at IS NULL AND (slug = ?1 OR path = ?2)"
    );
    let path = format!("/{}", slug.trim_start_matches('/'));
    let statement = db.prepare(&query);
    statement
        .bind(&[slug.into(), path.into()])?
        .first::<Entry>(None)
        .await
}

pub async fn find_published_page_by_path(db: &D1Database, path: &str) -> Result<Option<Entry>> {
    let normalized = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };
    let slug = normalized.trim_start_matches('/').to_string();

    let query = format!(
        "SELECT {ALL_COLUMNS} FROM entries WHERE type = 'page' AND status = 'published' AND deleted_at IS NULL AND (path = ?1 OR (path IS NULL AND slug = ?2))"
    );
    let statement = db.prepare(&query);
    statement
        .bind(&[normalized.into(), slug.into()])?
        .first::<Entry>(None)
        .await
}

pub async fn find_published_children(db: &D1Database, parent_id: i64) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE type = 'page' AND status = 'published' AND deleted_at IS NULL AND parent_id = ?1 ORDER BY sort_order ASC, title COLLATE NOCASE ASC"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[JsValue::from(parent_id as f64)])?
        .run()
        .await?;
    result.results::<Entry>()
}

pub async fn find_all_children(db: &D1Database, parent_id: i64) -> Result<Vec<Entry>> {
    let query = format!(
        "SELECT {LIST_COLUMNS} FROM entries WHERE parent_id = ?1 AND deleted_at IS NULL ORDER BY sort_order ASC, title COLLATE NOCASE ASC"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[JsValue::from(parent_id as f64)])?
        .run()
        .await?;
    result.results::<Entry>()
}

pub async fn find_page_ancestors(db: &D1Database, entry_id: i64) -> Result<Vec<BreadcrumbItem>> {
    let query = "WITH RECURSIVE ancestors(id, title, path, parent_id, level) AS (
        SELECT id, title, COALESCE(path, '/' || slug) as path, parent_id, 0
        FROM entries WHERE id = ?1 AND deleted_at IS NULL
        UNION ALL
        SELECT e.id, e.title, COALESCE(e.path, '/' || e.slug) as path, e.parent_id, a.level + 1
        FROM entries e JOIN ancestors a ON e.id = a.parent_id
        WHERE e.deleted_at IS NULL
    )
    SELECT title, path FROM ancestors WHERE id != ?1 ORDER BY level DESC";

    let statement = db.prepare(query);
    let result = statement
        .bind(&[JsValue::from(entry_id as f64)])?
        .run()
        .await?;
    result.results::<BreadcrumbItem>()
}

pub async fn find_entry_by_id(db: &D1Database, id: &str) -> Result<Option<Entry>> {
    let query = format!("SELECT {ALL_COLUMNS} FROM entries WHERE id = ?1");
    let statement = db.prepare(&query);
    statement.bind(&[id.into()])?.first::<Entry>(None).await
}

pub async fn find_entry_by_slug(db: &D1Database, slug: &str) -> Result<Option<Entry>> {
    let query = format!("SELECT {ALL_COLUMNS} FROM entries WHERE slug = ?1");
    let statement = db.prepare(&query);
    statement.bind(&[slug.into()])?.first::<Entry>(None).await
}

#[derive(serde::Deserialize)]
struct IdResult {
    id: i64,
}

pub async fn create_entry(db: &D1Database, payload: &CreateEntryRequest) -> Result<i64> {
    let entry_type = payload.r#type.as_deref().unwrap_or("post");
    let status = payload.status.as_deref().unwrap_or("published");

    let computed_path = if entry_type == "page" {
        if let Some(pid) = payload.parent_id {
            let parent = find_entry_by_id(db, &pid.to_string())
                .await?
                .ok_or_else(|| worker::Error::RustError("Parent page not found".into()))?;
            if parent.r#type != "page" {
                return Err(worker::Error::RustError(
                    "Parent entry is not a page".into(),
                ));
            }
            format!(
                "{}/{}",
                parent.path().trim_end_matches('/'),
                payload.slug.trim_start_matches('/')
            )
        } else {
            format!("/{}", payload.slug.trim_start_matches('/'))
        }
    } else {
        format!("/post/{}", payload.slug.trim_start_matches('/'))
    };

    let statement = db.prepare(
        "INSERT INTO entries (
            slug, title, type, status, description, cover_image, canonical_url, schema_json, category, tags, published_at, body_html, body_json, parent_id, path, sort_order, author_id
         ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            CASE WHEN ?4 = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
            ?11, ?12, ?13, ?14, ?15, ?16
         )",
    );

    let result = statement
        .bind(&[
            payload.slug.as_str().into(),
            payload.title.as_str().into(),
            entry_type.into(),
            status.into(),
            opt_js(&payload.description),
            opt_js(&payload.cover_image),
            opt_js(&payload.canonical_url),
            opt_js(&payload.schema_json),
            opt_js(&payload.category),
            opt_js(&payload.tags),
            payload.body_html.as_str().into(),
            payload.body_json.as_str().into(),
            opt_js_i64(&payload.parent_id),
            computed_path.into(),
            opt_js_i32(&payload.sort_order.or(Some(0))),
            opt_js_i64(&payload.author_id),
        ])?
        .run()
        .await?;

    let created_id = match result.meta()?.and_then(|m| m.last_row_id) {
        Some(rid) if rid > 0 => rid,
        _ => {
            let fetch_stmt = db.prepare("SELECT id FROM entries WHERE slug = ?1");
            let row = fetch_stmt
                .bind(&[payload.slug.as_str().into()])?
                .first::<IdResult>(None)
                .await?;
            row.map(|r| r.id).unwrap_or(0)
        }
    };

    Ok(created_id)
}

pub async fn update_entry(db: &D1Database, id: &str, payload: &UpdateEntryRequest) -> Result<bool> {
    let existing = match find_entry_by_id(db, id).await? {
        Some(e) => e,
        None => return Ok(false),
    };

    let new_type = payload.r#type.as_deref().unwrap_or(&existing.r#type);

    // Guard against converting a page to a post while it has active child pages
    if existing.r#type == "page" && new_type != "page" {
        let count_stmt = db.prepare(
            "SELECT COUNT(*) as count FROM entries WHERE parent_id = ?1 AND deleted_at IS NULL",
        );
        let count_res = count_stmt
            .bind(&[id.into()])?
            .first::<CountResult>(None)
            .await?;
        if let Some(c) = count_res {
            if c.count > 0 {
                return Err(worker::Error::RustError(
                    "Cannot change a page to a post while it has child pages. Please move or delete its child pages first."
                        .into(),
                ));
            }
        }
    }

    let new_parent_id = match payload.parent_id {
        Some(p) => p,
        None => existing.parent_id,
    };

    // Cycle detection if parent_id is being set
    if let Some(pid) = new_parent_id {
        if pid.to_string() == id {
            return Err(worker::Error::RustError(
                "A page cannot be its own parent".into(),
            ));
        }

        let cycle_stmt = db.prepare(
            "WITH RECURSIVE ancestors(id, parent_id) AS (
                SELECT id, parent_id FROM entries WHERE id = ?1
                UNION ALL
                SELECT e.id, e.parent_id FROM entries e JOIN ancestors a ON e.id = a.parent_id
            )
            SELECT id FROM ancestors WHERE id = ?2",
        );
        let cycle_res = cycle_stmt
            .bind(&[JsValue::from(pid as f64), id.into()])?
            .first::<serde_json::Value>(None)
            .await?;
        if cycle_res.is_some() {
            return Err(worker::Error::RustError(
                "Circular parent relationship detected".into(),
            ));
        }
    }

    // Compute updated path
    let new_path = if new_type == "page" {
        if let Some(pid) = new_parent_id {
            let parent = find_entry_by_id(db, &pid.to_string())
                .await?
                .ok_or_else(|| worker::Error::RustError("Parent page not found".into()))?;
            format!(
                "{}/{}",
                parent.path().trim_end_matches('/'),
                existing.slug.trim_start_matches('/')
            )
        } else {
            format!("/{}", existing.slug.trim_start_matches('/'))
        }
    } else {
        format!("/post/{}", existing.slug.trim_start_matches('/'))
    };

    let old_path = existing.path();
    if new_path != old_path {
        // Cascade path updates to all descendants
        let cascade_stmt = db.prepare(
            "UPDATE entries
             SET path = ?1 || SUBSTR(path, LENGTH(?2) + 1)
             WHERE path LIKE ?2 || '/%'",
        );
        cascade_stmt
            .bind(&[new_path.as_str().into(), old_path.as_str().into()])?
            .run()
            .await?;
    }

    let statement = db.prepare(
        "UPDATE entries
         SET title = COALESCE(?1, title),
             type = COALESCE(?2, type),
             status = COALESCE(?3, status),
             description = COALESCE(?4, description),
             cover_image = COALESCE(?5, cover_image),
             canonical_url = COALESCE(?6, canonical_url),
             schema_json = COALESCE(?7, schema_json),
             category = COALESCE(?8, category),
             tags = COALESCE(?9, tags),
             published_at = CASE
                 WHEN COALESCE(?3, status) = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP
                 WHEN COALESCE(?3, status) = 'draft' THEN NULL
                 ELSE published_at
             END,
             body_html = COALESCE(?10, body_html),
             body_json = COALESCE(?11, body_json),
             parent_id = CASE WHEN ?12 THEN ?13 ELSE parent_id END,
             path = ?14,
             sort_order = COALESCE(?15, sort_order),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?16",
    );

    let has_parent_update = payload.parent_id.is_some();
    let parent_id_val = opt_js_i64(&new_parent_id);

    let result = statement
        .bind(&[
            opt_js(&payload.title),
            opt_js(&payload.r#type),
            opt_js(&payload.status),
            opt_js(&payload.description),
            opt_js(&payload.cover_image),
            opt_js(&payload.canonical_url),
            opt_js(&payload.schema_json),
            opt_js(&payload.category),
            opt_js(&payload.tags),
            opt_js(&payload.body_html),
            opt_js(&payload.body_json),
            JsValue::from(has_parent_update),
            parent_id_val,
            new_path.into(),
            opt_js_i32(&payload.sort_order),
            id.into(),
        ])?
        .run()
        .await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn delete_entry(db: &D1Database, id: &str) -> Result<bool> {
    // Block deletion if any active child pages exist
    let count_stmt = db.prepare(
        "SELECT COUNT(*) as count FROM entries WHERE parent_id = ?1 AND deleted_at IS NULL",
    );
    let count_res = count_stmt
        .bind(&[id.into()])?
        .first::<CountResult>(None)
        .await?;
    if let Some(c) = count_res {
        if c.count > 0 {
            return Err(worker::Error::RustError(
                "Cannot delete a page that has child pages. Please move or delete its child pages first."
                    .into(),
            ));
        }
    }

    // Soft delete: set deleted_at = CURRENT_TIMESTAMP. Revisions are strictly preserved in entry_revisions.
    let statement = db.prepare(
        "UPDATE entries SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1 AND deleted_at IS NULL",
    );
    let result = statement.bind(&[id.into()])?.run().await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn restore_entry(db: &D1Database, id: &str) -> Result<bool> {
    let entry = match find_entry_by_id(db, id).await? {
        Some(e) => e,
        None => return Ok(false),
    };

    if entry.deleted_at.is_none() {
        return Err(worker::Error::RustError("Entry is not deleted".into()));
    }

    // Guard: cannot restore if parent page is also in Trash
    if let Some(pid) = entry.parent_id {
        if let Some(parent) = find_entry_by_id(db, &pid.to_string()).await? {
            if parent.deleted_at.is_some() {
                return Err(worker::Error::RustError(
                    "Cannot restore this page because its parent page is in the Trash. Please restore the parent page first."
                        .into(),
                ));
            }
        }
    }

    let statement = db.prepare("UPDATE entries SET deleted_at = NULL WHERE id = ?1");
    let result = statement.bind(&[id.into()])?.run().await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}
