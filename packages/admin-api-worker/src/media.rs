use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::{
    guess_mime_type, is_media_variant_key, media_variant_key, parse_filename_from_key,
    MediaSyncReport,
};
use worker::{Date, FormEntry, HttpMetadata, Request, Response, Result, RouteContext};

/// Upload an image to R2 and index it in D1 with atomic rollback on failure.
/// Supports both multipart/form-data with multi-tier WebP variants (file, thumb, md)
/// and direct binary uploads for backward compatibility.
pub async fn upload_media(mut req: Request, ctx: &RouteContext<()>) -> Result<Response> {
    let content_type_header = req
        .headers()
        .get("Content-Type")?
        .unwrap_or_default();

    let (safe_name, content_type, bytes, thumb, md) = if content_type_header.starts_with("multipart/form-data") {
        let form = req.form_data().await?;
        let (file_name, file_type, file_bytes) = match form.get("file") {
            Some(FormEntry::File(f)) => {
                let name = f.name();
                let ct = f.type_();
                let b = f.bytes().await?;
                (name, ct, b)
            }
            _ => {
                return AppError::BadRequest("Missing 'file' field in multipart form data".into())
                    .to_response();
            }
        };

        let thumb_bytes = match form.get("thumb") {
            Some(FormEntry::File(f)) => Some(f.bytes().await?),
            _ => None,
        };
        let md_bytes = match form.get("md") {
            Some(FormEntry::File(f)) => Some(f.bytes().await?),
            _ => None,
        };

        let safe: String = file_name
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '.' || *c == '_')
            .collect();
        let safe = if safe.is_empty() {
            "upload.bin".to_string()
        } else {
            safe
        };

        let ct = if !file_type.is_empty() && file_type != "application/octet-stream" {
            file_type
        } else {
            guess_mime_type(&safe).to_string()
        };

        (safe, ct, file_bytes, thumb_bytes, md_bytes)
    } else {
        // Direct binary upload fallback
        let url = req.url()?;
        let original_filename = url
            .query_pairs()
            .find(|(k, _)| k == "filename")
            .map(|(_, v)| v.to_string())
            .unwrap_or_else(|| "upload.bin".to_string());

        let safe: String = original_filename
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '.' || *c == '_')
            .collect();
        let safe = if safe.is_empty() {
            "upload.bin".to_string()
        } else {
            safe
        };

        let ct = if !content_type_header.is_empty()
            && content_type_header != "application/octet-stream"
        {
            content_type_header
        } else {
            guess_mime_type(&safe).to_string()
        };

        let b = req.bytes().await?;
        (safe, ct, b, None, None)
    };

    if bytes.is_empty() {
        return AppError::BadRequest("File body cannot be empty".into()).to_response();
    }

    let size_bytes = bytes.len() as i64;
    let key = format!("{}-{}", Date::now().as_millis(), safe_name);
    let mut uploaded_r2_keys: Vec<String> = vec![key.clone()];

    // 1. Save primary asset to Cloudflare R2
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

    // 2. Save derived WebP variants if provided
    if let Some(thumb_bytes) = thumb {
        if let Some(thumb_key) = media_variant_key(&key, "thumb") {
            let thumb_meta = HttpMetadata {
                content_type: Some("image/webp".to_string()),
                ..Default::default()
            };
            bucket
                .put(&thumb_key, thumb_bytes)
                .http_metadata(thumb_meta)
                .execute()
                .await?;
            uploaded_r2_keys.push(thumb_key);
        }
    }

    if let Some(md_bytes) = md {
        if let Some(md_key) = media_variant_key(&key, "md") {
            let md_meta = HttpMetadata {
                content_type: Some("image/webp".to_string()),
                ..Default::default()
            };
            bucket
                .put(&md_key, md_bytes)
                .http_metadata(md_meta)
                .execute()
                .await?;
            uploaded_r2_keys.push(md_key);
        }
    }

    // 3. Index in D1 with atomic rollback of all uploaded R2 keys on failure
    let db = ctx.env.d1("DB")?;
    if let Err(db_err) = db::insert_media(&db, &key, &safe_name, &content_type, size_bytes).await {
        worker::console_error!(
            "Failed to insert media into D1: {db_err}. Rolling back R2 objects for asset '{key}'."
        );
        for k in uploaded_r2_keys {
            let _ = bucket.delete(&k).await;
        }
        return Response::error(format!("Database indexing failed: {db_err}"), 500);
    }

    // 4. Return the public URL and metadata for editor insertion
    Response::from_json(&serde_json::json!({
        "url": format!("/media/{}", key),
        "key": key,
        "filename": safe_name,
        "mime_type": content_type,
        "size_bytes": size_bytes,
        "size": size_bytes,
    }))
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

/// Delete an image from both D1 and R2, cascading to all multi-tier WebP variants
pub async fn delete_media(key: &str, ctx: &RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    db::delete_media_by_key(&db, key).await?;

    let bucket = ctx.env.bucket("MEDIA")?;
    let _ = bucket.delete(key).await;

    // Delete derived WebP variants if they exist
    if let Some(thumb_key) = media_variant_key(key, "thumb") {
        let _ = bucket.delete(&thumb_key).await;
    }
    if let Some(md_key) = media_variant_key(key, "md") {
        let _ = bucket.delete(&md_key).await;
    }

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

            // Skip multi-tier variant keys so D1 keeps only one row per logical asset
            if is_media_variant_key(&key) {
                continue;
            }

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

pub async fn get_media(key: &str, req: &Request, ctx: &RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let size_param = url
        .query_pairs()
        .find(|(k, _)| k == "size")
        .map(|(_, v)| v.to_string());

    let target_key = if let Some(size) = size_param.as_deref() {
        media_variant_key(key, size).unwrap_or_else(|| key.to_string())
    } else {
        key.to_string()
    };

    let bucket = ctx.env.bucket("MEDIA")?;
    let object = match bucket.get(&target_key).execute().await? {
        Some(obj) => Some(obj),
        None if target_key != key => bucket.get(key).execute().await?,
        None => None,
    };

    match object.ok_or(AppError::NotFound) {
        Ok(obj) => {
            let headers = worker::Headers::new();

            if let Some(ct) = obj.http_metadata().content_type {
                headers.set("Content-Type", &ct)?;
            }

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
