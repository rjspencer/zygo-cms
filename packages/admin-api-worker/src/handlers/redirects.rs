use worker::*;
use zygo_core::{
    error::AppError,
    models::{CreateRedirectReq, UpdateRedirectReq},
};

fn validate_redirect(source_path: &str, target_url: &str, status_code: i32) -> std::result::Result<(), AppError> {
    if !source_path.starts_with('/') {
        return Err(AppError::BadRequest("Source path must start with a leading slash ('/')".into()));
    }
    if source_path == "/" {
        return Err(AppError::BadRequest("Source path cannot be the root ('/') path".into()));
    }
    if source_path == target_url {
        return Err(AppError::BadRequest("Source path cannot be identical to target URL (infinite redirect loop)".into()));
    }
    if status_code != 301 && status_code != 302 {
        return Err(AppError::BadRequest("Status code must be 301 (Permanent) or 302 (Temporary)".into()));
    }

    let reserved_exact = ["/search", "/sitemap.xml", "/rss.xml", "/feed.xml"];
    let reserved_prefixes = ["/api/", "/media/", "/preview/"];

    for exact in reserved_exact {
        if source_path == exact || source_path.starts_with(&format!("{}/", exact)) {
            return Err(AppError::BadRequest(format!("Source path '{}' is a reserved system route", source_path)));
        }
    }

    for prefix in reserved_prefixes {
        if source_path.starts_with(prefix) || source_path == prefix.trim_end_matches('/') {
            return Err(AppError::BadRequest(format!("Source path '{}' conflicts with reserved prefix '{}'", source_path, prefix)));
        }
    }

    if target_url.trim().is_empty() {
        return Err(AppError::BadRequest("Target URL cannot be empty".into()));
    }

    Ok(())
}

pub async fn list_redirects(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);

    let db = ctx.env.d1("DB")?;
    let redirects = zygo_core::db::redirect::get_all(&db).await?;
    Response::from_json(&redirects)
}

pub async fn create_redirect(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);

    let payload: CreateRedirectReq = match req.json().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    if let Err(err) = validate_redirect(&payload.source_path, &payload.target_url, payload.status_code) {
        return err.to_response();
    }

    let db = ctx.env.d1("DB")?;
    match zygo_core::db::redirect::create(&db, &payload).await {
        Ok(created) => {
            let origin = crate::handlers::api::resolve_canonical_origin(&req, &ctx.env, &db)
                .await
                .unwrap_or_default();
            let mut purge_list = vec![created.source_path.clone()];
            if !origin.is_empty() {
                purge_list.push(format!("{}{}", origin.trim_end_matches('/'), created.source_path));
            }
            crate::cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&created)
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE") || msg.contains("unique") {
                AppError::Conflict("A redirect with this source path already exists".into()).to_response()
            } else {
                Err(e)
            }
        }
    }
}

pub async fn update_redirect(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);

    let id = match ctx.param("id").and_then(|i| i.parse::<i64>().ok()) {
        Some(id) => id,
        None => return AppError::BadRequest("Invalid redirect ID".into()).to_response(),
    };

    let payload: UpdateRedirectReq = match req.json().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;
    let existing = match zygo_core::db::redirect::find_by_id(&db, id).await? {
        Some(r) => r,
        None => return AppError::NotFound.to_response(),
    };

    let effective_source = payload.source_path.as_deref().unwrap_or(&existing.source_path);
    let effective_target = payload.target_url.as_deref().unwrap_or(&existing.target_url);
    let effective_status = payload.status_code.unwrap_or(existing.status_code);

    if let Err(err) = validate_redirect(effective_source, effective_target, effective_status) {
        return err.to_response();
    }

    match zygo_core::db::redirect::update(&db, id, &payload).await {
        Ok(Some(updated)) => {
            let origin = crate::handlers::api::resolve_canonical_origin(&req, &ctx.env, &db)
                .await
                .unwrap_or_default();
            let mut purge_list = vec![existing.source_path.clone(), updated.source_path.clone()];
            if !origin.is_empty() {
                purge_list.push(format!("{}{}", origin.trim_end_matches('/'), existing.source_path));
                purge_list.push(format!("{}{}", origin.trim_end_matches('/'), updated.source_path));
            }
            crate::cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&updated)
        }
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE") || msg.contains("unique") {
                AppError::Conflict("A redirect with this source path already exists".into()).to_response()
            } else {
                Err(e)
            }
        }
    }
}

pub async fn delete_redirect(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);

    let id = match ctx.param("id").and_then(|i| i.parse::<i64>().ok()) {
        Some(id) => id,
        None => return AppError::BadRequest("Invalid redirect ID".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;
    let existing = match zygo_core::db::redirect::find_by_id(&db, id).await? {
        Some(r) => r,
        None => return AppError::NotFound.to_response(),
    };

    let success = zygo_core::db::redirect::delete(&db, id).await?;
    if success {
        let origin = crate::handlers::api::resolve_canonical_origin(&req, &ctx.env, &db)
            .await
            .unwrap_or_default();
        let mut purge_list = vec![existing.source_path.clone()];
        if !origin.is_empty() {
            purge_list.push(format!("{}{}", origin.trim_end_matches('/'), existing.source_path));
        }
        crate::cache::purge_urls(&ctx.env, purge_list).await;

        Response::from_json(&serde_json::json!({ "success": true }))
    } else {
        AppError::NotFound.to_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_redirect_success() {
        assert!(validate_redirect("/old-page", "/new-page", 301).is_ok());
        assert!(validate_redirect("/promo", "https://partner.com", 302).is_ok());
    }

    #[test]
    fn test_validate_redirect_missing_leading_slash() {
        let res = validate_redirect("old-page", "/new-page", 301);
        assert!(res.is_err());
    }

    #[test]
    fn test_validate_redirect_root_rejected() {
        let res = validate_redirect("/", "/home", 301);
        assert!(res.is_err());
    }

    #[test]
    fn test_validate_redirect_loop_rejected() {
        let res = validate_redirect("/loop", "/loop", 301);
        assert!(res.is_err());
    }

    #[test]
    fn test_validate_redirect_invalid_status_code() {
        let res = validate_redirect("/a", "/b", 200);
        assert!(res.is_err());
    }

    #[test]
    fn test_validate_redirect_reserved_routes() {
        assert!(validate_redirect("/api/entries", "/new", 301).is_err());
        assert!(validate_redirect("/media/photo.jpg", "/new", 301).is_err());
        assert!(validate_redirect("/preview/token123", "/new", 301).is_err());
        assert!(validate_redirect("/search", "/new", 301).is_err());
        assert!(validate_redirect("/sitemap.xml", "/new", 301).is_err());
        assert!(validate_redirect("/rss.xml", "/new", 301).is_err());
        assert!(validate_redirect("/feed.xml", "/new", 301).is_err());
    }
}
