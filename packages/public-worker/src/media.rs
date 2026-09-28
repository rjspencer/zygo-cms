use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::{MediaSyncReport, guess_mime_type, parse_filename_from_key};
use worker::{Date, Headers, Response, Result, RouteContext};

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
