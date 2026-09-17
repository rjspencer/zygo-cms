use crate::error::AppError;
use worker::{Date, Headers, HttpMetadata, Request, Response, Result, RouteContext};

/// Upload an image to R2
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

    // Prefix with a timestamp to prevent overwriting files with the same name
    let key = format!("{}-{}", Date::now().as_millis(), safe_name);

    // Extract content-type header (e.g. image/png, image/jpeg)
    let content_type = req
        .headers()
        .get("Content-Type")?
        .unwrap_or_else(|| "application/octet-stream".into());

    // Read the binary bytes from the request stream
    let bytes = req.bytes().await?;

    if bytes.is_empty() {
        return AppError::BadRequest("File body cannot be empty".into()).to_response();
    }

    // Save to Cloudflare R2
    let bucket = ctx.env.bucket("MEDIA")?;
    let metadata = HttpMetadata {
        content_type: Some(content_type),
        ..Default::default()
    };

    bucket
        .put(&key, bytes)
        .http_metadata(metadata)
        .execute()
        .await?;

    // 5. Return the public URL for TipTap to insert
    Response::from_json(&serde_json::json!({
        "url": format!("/media/{}", key),
        "key": key
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

/// List uploaded images from R2 (newest first)
pub async fn list_media(ctx: &RouteContext<()>) -> Result<Response> {
    let bucket = ctx.env.bucket("MEDIA")?;
    let objects = bucket.list().limit(100).execute().await?;

    let mut items = Vec::new();
    for obj in objects.objects() {
        let key = obj.key();
        let size = obj.size();
        let url = format!("/media/{}", key);
        items.push(serde_json::json!({
            "key": key,
            "url": url,
            "size": size,
        }));
    }

    // Sort newest first by key timestamp prefix
    items.sort_by(|a, b| {
        let a_str = a["key"].as_str().unwrap_or("");
        let b_str = b["key"].as_str().unwrap_or("");
        b_str.cmp(a_str)
    });

    Response::from_json(&serde_json::json!({ "media": items }))
}

/// Delete an image from R2
pub async fn delete_media(key: &str, ctx: &RouteContext<()>) -> Result<Response> {
    let bucket = ctx.env.bucket("MEDIA")?;
    bucket.delete(key).await?;
    Response::from_json(&serde_json::json!({ "success": true, "key": key }))
}
