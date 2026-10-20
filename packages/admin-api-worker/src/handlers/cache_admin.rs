use crate::{auth_required, cache};
use serde_json::json;
use worker::*;
use zygo_core::db;

/// Clears all cached public content and busts the stylesheet cache.
///
/// Rotates `cache_bust_nonce` so `styles_hash` changes (forcing browsers and the edge to fetch a
/// fresh `/style-<hash>.css`, e.g. after a style-only deploy), then purges every cached object
/// for the site's hosts.
pub async fn clear_cache(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let d1 = ctx.env.d1("DB")?;
    let nonce = Date::now().as_millis().to_string();
    db::setting::set_setting(&d1, "cache_bust_nonce", &nonce).await?;

    let settings = db::setting::get_settings_map(&d1).await.unwrap_or_default();
    let old_hash = settings.get("styles_hash").cloned();
    let templates = db::layout_template::get_all(&d1).await.unwrap_or_default();
    let css_parts: Vec<&str> = templates.iter().map(|t| t.template_css.as_str()).collect();
    let new_hash = zygo_core::models::compute_theme_styles_hash(&css_parts, Some(&settings));
    db::setting::set_setting(&d1, "styles_hash", &new_hash).await?;

    let origin = crate::handlers::api::resolve_canonical_origin(&req, &ctx.env, &d1).await?;

    let mut purge_list = vec![
        format!("{}/style.css", origin),
        format!("{}/style-{}.css", origin, new_hash),
    ];
    if let Some(old) = old_hash {
        purge_list.push(format!("{}/style-{}.css", origin, old));
    }
    cache::purge_urls(&ctx.env, purge_list).await;
    cache::purge_hosts(&ctx.env, vec![origin]).await;

    Response::from_json(&json!({ "success": true, "styles_hash": new_hash }))
}
