use crate::db;
use crate::error::AppError;
use crate::models::{MediaSyncReport, guess_mime_type, parse_filename_from_key};
use worker::{Date, Headers, HttpMetadata, Request, Response, Result, RouteContext};

/// Upload an image to R2 and index it in D1 with atomic rollback on failure
pub async fn upload_media(mut req: Request, ctx: &RouteContext<()>) -> Result<Response> {
    // Get the original filename from the query string (e.g. /api/media?filename=photo.png)
    let url = req.url()?;
    let original_filename = url
        .query_pairs()
        .find(|(k, _)| k == "filename")
        .map(|(_, v)| v.to_string())
        .unwrap_or_else(|| "upload.bin".to_string());

    // Sanitize the filename to alphanumeric characters, dashes, and dots
    let safe_name: String = original_filename
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '.' || *c == '_')
        .collect();

    let safe_name = if safe_name.is_empty() {
        "upload.bin".to_string()
    } else {
        safe_name
    };

    // Prefix with a timestamp to prevent overwriting files with the same name
    let key = format!("{}-{}", Date::now().as_millis(), safe_name);

    // Extract content-type header, or infer from filename extension
    let content_type = req
        .headers()
        .get("Content-Type")?
        .filter(|ct| !ct.is_empty() && ct != "application/octet-stream")
        .unwrap_or_else(|| guess_mime_type(&safe_name).to_string());

    // Read binary bytes from request stream
    let bytes = req.bytes().await?;
    if bytes.is_empty() {
        return AppError::BadRequest("File body cannot be empty".into()).to_response();
    }

    let size_bytes = bytes.len() as i64;

    // 1. Save to Cloudflare R2
    let bucket = ctx.env.bucket("MEDIA")?;
    let metadata = HttpMetadata {
        content_type: Some(content_type.clone()),
        ..Default::default()
    };

    bucket
        .put(&key, bytes)
        .http_metadata(metadata)
        .execute()
        .await?;

    // 2. Index in D1 with atomic rollback on failure
    let db = ctx.env.d1("DB")?;
    if let Err(db_err) = db::insert_media(&db, &key, &safe_name, &content_type, size_bytes).await {
        worker::console_error!(
            "Failed to insert media into D1: {db_err}. Rolling back R2 object '{key}'."
        );
        let _ = bucket.delete(&key).await;
        return Response::error(format!("Database indexing failed: {db_err}"), 500);
    }

    // 3. Return the public URL and metadata for editor insertion
    Response::from_json(&serde_json::json!({
        "url": format!("/media/{}", key),
        "key": key,
        "filename": safe_name,
        "mime_type": content_type,
        "size_bytes": size_bytes,
        "size": size_bytes,
    }))
}

/// Serve an image from R2 with caching headers
pub async fn get_media(key: &str, ctx: &RouteContext<()>) -> Result<Response> {
    let bucket = ctx.env.bucket("MEDIA")?;
    let object = bucket.get(key).execute().await?.ok_or(AppError::NotFound);

    match object {
        Ok(obj) => {
            let headers = Headers::new();

            // Set Content-Type from R2 metadata if available
            if let Some(ct) = obj.http_metadata().content_type {
                headers.set("Content-Type", &ct)?;
            }

            // Cache images in browser for 1 year (since filenames have unique timestamps)
            headers.set("Cache-Control", "public, max-age=31536000, immutable")?;

            let Some(body) = obj.body() else {
                return AppError::NotFound.to_response();
            };
            let bytes = body.bytes().await?;

            Response::from_bytes(bytes).map(|res| res.with_headers(headers))
        }
        Err(err) => err.to_response(),
    }
}

/// List uploaded images from D1 with search, sorting, and pagination
pub async fn list_media(req: &Request, ctx: &RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let query_map: std::collections::HashMap<String, String> =
        url.query_pairs().into_owned().collect();

    let search = query_map.get("search").map(|s| s.as_str());
    let sort = query_map
        .get("sort")
        .map(|s| s.as_str())
        .unwrap_or("newest");
    let page = query_map
        .get("page")
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(1)
        .max(1);
    let per_page = query_map
        .get("per_page")
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(24)
        .max(1)
        .min(100);

    let db = ctx.env.d1("DB")?;
    let total_items = db::count_media(&db, search).await?;
    let total_pages = if total_items == 0 {
        1
    } else {
        ((total_items - 1) / per_page) + 1
    };

    let effective_page = page.min(total_pages);
    let offset = (effective_page - 1) * per_page;

    let items = db::find_media_paginated(&db, search, Some(sort), per_page, offset).await?;

    let media_json: Vec<serde_json::Value> = items
        .into_iter()
        .map(|item| {
            let url = item.url();
            let size = item.size_bytes;
            serde_json::json!({
                "id": item.id,
                "key": item.key,
                "filename": item.filename,
                "mime_type": item.mime_type,
                "size_bytes": item.size_bytes,
                "size": size,
                "url": url,
                "created_at": item.created_at,
            })
        })
        .collect();

    Response::from_json(&serde_json::json!({
        "media": media_json,
        "pagination": {
            "page": effective_page,
            "per_page": per_page,
            "total_items": total_items,
            "total_pages": total_pages,
        }
    }))
}

/// Delete an image from both D1 and R2
pub async fn delete_media(key: &str, ctx: &RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    db::delete_media_by_key(&db, key).await?;

    let bucket = ctx.env.bucket("MEDIA")?;
    bucket.delete(key).await?;

    Response::from_json(&serde_json::json!({ "success": true, "key": key }))
}

/// Reconcile R2 bucket contents into D1 database index with timeout and iteration guards
pub async fn sync_r2_to_d1(env: &worker::Env) -> Result<MediaSyncReport> {
    let bucket = env.bucket("MEDIA")?;
    let db = env.d1("DB")?;

    let existing_keys = db::find_all_media_keys(&db).await?;

    let start_time = Date::now().as_millis();
    const MAX_DURATION_MS: u64 = 25_000; // 25s ceiling before worker runtime cutoff
    const MAX_PAGES: usize = 10; // Process up to 10,000 items per run

    let mut cursor: Option<String> = None;
    let mut page_count: usize = 0;
    let mut total_r2_objects: usize = 0;
    let mut synced: usize = 0;
    let mut truncated = false;

    loop {
        if page_count >= MAX_PAGES || (Date::now().as_millis() - start_time) > MAX_DURATION_MS {
            worker::console_warn!(
                "R2-to-D1 Sync reached limit (pages: {page_count}, elapsed: {}ms); stopping early",
                Date::now().as_millis() - start_time
            );
            truncated = true;
            break;
        }

        page_count += 1;
        let mut builder = bucket.list().limit(1000);
        if let Some(ref c) = cursor {
            builder = builder.cursor(c.clone());
        }

        let objects_page = builder.execute().await?;
        let is_page_truncated = objects_page.truncated();
        let next_cursor = objects_page.cursor();

        for obj in objects_page.objects() {
            total_r2_objects += 1;
            let key = obj.key();
            if !existing_keys.contains(&key) {
                let filename = parse_filename_from_key(&key);
                let mime_type = obj
                    .http_metadata()
                    .content_type
                    .unwrap_or_else(|| guess_mime_type(&filename).to_string());
                let size_bytes = obj.size() as i64;

                db::insert_media(&db, &key, &filename, &mime_type, size_bytes).await?;
                synced += 1;
            }
        }

        if !is_page_truncated || next_cursor.is_none() {
            break;
        }

        // Prevent infinite loops if R2 returns the exact same cursor
        if next_cursor == cursor {
            break;
        }
        cursor = next_cursor;
    }

    let already_indexed = total_r2_objects.saturating_sub(synced);
    worker::console_log!(
        "R2-to-D1 Sync complete: {} scanned, {} newly indexed, {} already indexed (truncated: {})",
        total_r2_objects,
        synced,
        already_indexed,
        truncated
    );

    Ok(MediaSyncReport {
        synced,
        total_r2_objects,
        already_indexed,
        truncated,
    })
}
