use crate::{auth_required, cache};
use worker::*;
use zygo_core::db;
use zygo_core::models::{
    validate_backup_payload, ImportBackupRequest, ImportBackupResponse, ImportCounts,
    ZygoBackupPayload,
};

/// GET /api/admin/export
///
/// Exports a complete snapshot of all database-backed CMS state as a portable JSON archive.
pub async fn export_backup(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let d1 = ctx.env.d1("DB")?;
    let payload = db::backup::export_site_backup(&d1).await?;

    let date_str = if payload.exported_at.len() >= 10 {
        &payload.exported_at[..10]
    } else {
        "site"
    };
    let filename = format!("zygo-backup-{}.json", date_str);

    let json_str = serde_json::to_string_pretty(&payload)
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    let headers = Headers::new();
    headers.set("Content-Type", "application/json")?;
    headers.set(
        "Content-Disposition",
        &format!("attachment; filename=\"{}\"", filename),
    )?;

    Ok(Response::ok(json_str)?.with_headers(headers))
}

/// POST /api/admin/import
///
/// Validates and imports a site backup payload. Supports dry-run validation and edge cache purge.
pub async fn import_backup(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let body_val: serde_json::Value = match req.json().await {
        Ok(v) => v,
        Err(e) => return Response::error(format!("Invalid JSON body: {}", e), 400),
    };

    let (payload, dry_run): (ZygoBackupPayload, bool) = if body_val.get("backup").is_some() {
        let req_obj: ImportBackupRequest = match serde_json::from_value(body_val) {
            Ok(r) => r,
            Err(e) => return Response::error(format!("Failed to parse import request: {}", e), 400),
        };
        let p = match req_obj.backup {
            Some(b) => b,
            None => return Response::error("Missing backup payload in import request", 400),
        };
        (p, req_obj.dry_run.unwrap_or(false))
    } else {
        let p: ZygoBackupPayload = match serde_json::from_value(body_val) {
            Ok(p) => p,
            Err(e) => return Response::error(format!("Failed to parse backup payload: {}", e), 400),
        };
        (p, false)
    };

    // 1. Validate template syntax and schema integrity before any D1 writes
    let warnings = match validate_backup_payload(&payload) {
        Ok(w) => w,
        Err(err) => {
            return Ok(Response::from_json(&serde_json::json!({
                "success": false,
                "error": err,
            }))?
            .with_status(400));
        }
    };

    // 2. Dry-run mode: return counts without mutating D1
    if dry_run {
        let counts = ImportCounts {
            settings: payload.settings.len(),
            menus: payload.menus.len(),
            section_templates: payload.section_templates.len(),
            layout_templates: payload.layout_templates.len(),
            entries: payload.entries.len(),
            redirects: payload.redirects.len(),
            media: payload.media_manifest.len(),
        };

        return Response::from_json(&ImportBackupResponse {
            success: true,
            dry_run: true,
            counts,
            warnings,
        });
    }

    // 3. Live mode: commit to D1
    let d1 = ctx.env.d1("DB")?;
    let counts = db::backup::import_site_backup(&d1, &payload).await?;

    // 4. Invalidate styles hash and purge edge cache
    let settings = db::setting::get_settings_map(&d1).await.unwrap_or_default();
    let old_hash = settings.get("styles_hash").cloned();
    let templates = db::layout_template::get_all(&d1).await.unwrap_or_default();
    let css_parts: Vec<&str> = templates.iter().map(|t| t.template_css.as_str()).collect();
    let new_hash = zygo_core::models::compute_theme_styles_hash(&css_parts, Some(&settings));
    let _ = db::setting::set_setting(&d1, "styles_hash", &new_hash).await;

    let origin = crate::handlers::api::resolve_canonical_origin(&req, &ctx.env, &d1)
        .await
        .unwrap_or_default();

    let mut purge_list = vec![
        format!("{}/", origin),
        format!("{}/posts", origin),
        format!("{}/post", origin),
        format!("{}/style.css", origin),
        format!("{}/style-{}.css", origin, new_hash),
        format!("{}/sitemap.xml", origin),
        format!("{}/rss.xml", origin),
        format!("{}/feed.xml", origin),
    ];
    if let Some(old) = old_hash {
        purge_list.push(format!("{}/style-{}.css", origin, old));
    }
    for entry in &payload.entries {
        if let Some(ref p) = entry.path {
            if !p.is_empty() {
                purge_list.push(format!("{}{}", origin.trim_end_matches('/'), p));
            }
        }
    }
    cache::purge_urls(&ctx.env, purge_list).await;
    if !origin.is_empty() {
        cache::purge_hosts(&ctx.env, vec![origin]).await;
    }

    Response::from_json(&ImportBackupResponse {
        success: true,
        dry_run: false,
        counts,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_import_request_wrapped_deserialization() {
        let json = r#"{
            "dry_run": true,
            "backup": {
                "version": "1.0",
                "exported_at": "2026-10-23T22:00:00Z",
                "settings": { "site_title": "Wrapped Site" },
                "menus": [],
                "section_templates": [],
                "layout_templates": [],
                "entries": [],
                "redirects": [],
                "media_manifest": []
            }
        }"#;

        let parsed: ImportBackupRequest = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.dry_run, Some(true));
        let backup = parsed.backup.unwrap();
        assert_eq!(backup.settings.get("site_title").unwrap(), "Wrapped Site");
    }

    #[test]
    fn test_import_request_bare_payload_deserialization() {
        let json = r#"{
            "version": "1.0",
            "exported_at": "2026-10-23T22:00:00Z",
            "settings": { "site_title": "Bare Site" },
            "menus": [],
            "section_templates": [],
            "layout_templates": [],
            "entries": [],
            "redirects": [],
            "media_manifest": []
        }"#;

        let parsed: ZygoBackupPayload = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.settings.get("site_title").unwrap(), "Bare Site");
    }

    #[test]
    fn test_import_response_serialization() {
        let resp = ImportBackupResponse {
            success: true,
            dry_run: true,
            counts: ImportCounts {
                settings: 5,
                menus: 2,
                section_templates: 3,
                layout_templates: 1,
                entries: 10,
                redirects: 4,
                media: 7,
            },
            warnings: vec!["Section template 'hero' warning: unused var".to_string()],
        };

        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"dry_run\":true"));
        assert!(json.contains("\"settings\":5"));
        assert!(json.contains("\"media\":7"));
    }
}
