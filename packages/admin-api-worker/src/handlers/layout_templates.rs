use crate::auth_required;
use worker::{Request, Response, Result, RouteContext};
use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::{LayoutTemplate, LayoutTemplatePayload, LayoutTemplateRevision};

pub async fn list_layout_templates(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;

    match db::layout_template::get_all(&d1).await {
        Ok(templates) => Response::from_json(&templates),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn get_layout_template(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(template)) => Response::from_json(&template),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn update_layout_template(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let payload: LayoutTemplatePayload = match req.json().await {
        Ok(p) => p,
        Err(e) => return AppError::BadRequest(format!("Invalid payload: {}", e)).to_response(),
    };

    let existing = match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    // Save previous state as revision
    let rev = LayoutTemplateRevision {
        id: crate::utils::generate_id(),
        layout_template_id: existing.id.clone(),
        template_html: existing.template_html,
        template_css: existing.template_css,
        created_at: String::new(),
    };
    let _ = db::layout_template::create_revision(&d1, &rev).await;

    // Apply update
    if let Err(e) = db::layout_template::upsert(&d1, id, &payload).await {
        return AppError::ServerError(e.to_string()).to_response();
    }

    // Recompute styles hash and purge edge cache
    recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(updated)) => Response::from_json(&updated),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn list_layout_template_revisions(
    req: Request,
    ctx: RouteContext<()>,
) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    match db::layout_template::get_revisions(&d1, id).await {
        Ok(revisions) => Response::from_json(&revisions),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn restore_layout_template_revision(
    req: Request,
    ctx: RouteContext<()>,
) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let revision_id = match ctx.param("revision_id") {
        Some(r) => r,
        None => return AppError::BadRequest("Missing revision_id".into()).to_response(),
    };
    let d1 = ctx.env.d1("DB")?;

    let existing = match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    // Save current state as revision before restoring
    let rev = LayoutTemplateRevision {
        id: crate::utils::generate_id(),
        layout_template_id: existing.id.clone(),
        template_html: existing.template_html,
        template_css: existing.template_css,
        created_at: String::new(),
    };
    let _ = db::layout_template::create_revision(&d1, &rev).await;

    if let Err(e) = db::layout_template::restore_revision(&d1, id, revision_id).await {
        return AppError::ServerError(e.to_string()).to_response();
    }

    recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(restored)) => Response::from_json(&restored),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn reset_layout_template(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let seed_payload = match LayoutTemplate::default_seed(id) {
        Some(p) => p,
        None => {
            return AppError::BadRequest(format!("No default seed template found for '{}'", id))
                .to_response()
        }
    };

    let existing = match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    // Save current state as revision before resetting
    let rev = LayoutTemplateRevision {
        id: crate::utils::generate_id(),
        layout_template_id: existing.id.clone(),
        template_html: existing.template_html,
        template_css: existing.template_css,
        created_at: String::new(),
    };
    let _ = db::layout_template::create_revision(&d1, &rev).await;

    if let Err(e) = db::layout_template::upsert(&d1, id, &seed_payload).await {
        return AppError::ServerError(e.to_string()).to_response();
    }

    recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::layout_template::get_by_id(&d1, id).await {
        Ok(Some(reset)) => Response::from_json(&reset),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

async fn recompute_and_purge(env: &worker::Env, d1: &worker::D1Database, req: &Request) {
    let all_templates = db::layout_template::get_all(d1).await.unwrap_or_default();
    let settings = db::setting::get_settings_map(d1).await.unwrap_or_default();
    let old_hash = settings.get("styles_hash").cloned();
    let css_parts: Vec<&str> = all_templates.iter().map(|t| t.template_css.as_str()).collect();
    let new_hash = zygo_core::models::compute_styles_hash(&css_parts);
    let _ = db::setting::set_setting(d1, "styles_hash", &new_hash).await;

    let origin = match req.url() {
        Ok(u) => u.origin().ascii_serialization(),
        Err(_) => String::new(),
    };

    let mut purge_list = vec![
        "/".to_string(),
        "/posts".to_string(),
        "/post".to_string(),
        "/style.css".to_string(),
        format!("/style-{}.css", new_hash),
    ];
    if !origin.is_empty() {
        purge_list.push(format!("{}/", origin));
        purge_list.push(format!("{}/posts", origin));
        purge_list.push(format!("{}/post", origin));
        purge_list.push(format!("{}/style.css", origin));
        purge_list.push(format!("{}/style-{}.css", origin, new_hash));
    }
    if let Some(old) = old_hash {
        purge_list.push(format!("/style-{}.css", old));
        if !origin.is_empty() {
            purge_list.push(format!("{}/style-{}.css", origin, old));
        }
    }
    crate::cache::purge_urls(env, purge_list).await;
}

#[cfg(test)]
mod tests {
    use zygo_core::models::layout_defaults;

    #[test]
    fn test_default_layout_templates_exist() {
        let post = layout_defaults::get_default_layout_template("post");
        assert!(post.is_some());
        let post = post.unwrap();
        assert_eq!(post.name.as_deref(), Some("Post Template"));
        assert!(post.template_html.as_ref().unwrap().contains("{{ post.title }}"));
        assert!(post.template_css.as_ref().unwrap().contains(".posts-list"));

        let doc = layout_defaults::get_default_layout_template("doc");
        assert!(doc.is_some());
        let doc = doc.unwrap();
        assert_eq!(doc.name.as_deref(), Some("Documentation Layout"));
        assert!(doc.template_html.as_ref().unwrap().contains("class=\"docs-layout\""));
        assert!(doc.template_css.as_ref().unwrap().contains("body.docs-page"));

        let page = layout_defaults::get_default_layout_template("page");
        assert!(page.is_some());
        let page = page.unwrap();
        assert_eq!(page.name.as_deref(), Some("Page Template"));
        assert!(page.template_html.as_ref().unwrap().contains("{{ page.title }}"));

        let unknown = layout_defaults::get_default_layout_template("nonexistent");
        assert!(unknown.is_none());
    }

    #[test]
    fn test_compute_styles_hash_changes_with_css() {
        let hash1 = zygo_core::models::compute_styles_hash(&[".post { color: red; }"]);
        let hash2 = zygo_core::models::compute_styles_hash(&[".post { color: blue; }"]);
        let hash3 = zygo_core::models::compute_styles_hash(&[".post { color: red; }"]);

        assert_ne!(hash1, hash2);
        assert_eq!(hash1, hash3);
        assert_eq!(hash1.len(), 8);
    }
}
