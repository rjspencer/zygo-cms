use worker::*;
use zygo_core::db;
use crate::{auth_required, utils::get_auth_url};
use serde_json::json;

pub async fn dashboard(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let db = ctx.env.d1("DB")?;
    
    let page_count = db::count_entries_by_type(&db, "page").await?;
    let post_count = db::count_entries_by_type(&db, "post").await?;
    let author_count = db::count_users(&db).await?;
    
    let auth_url = get_auth_url(&ctx.env);
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    Response::from_json(&json!({
        "page_count": page_count,
        "post_count": post_count,
        "author_count": author_count,
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled
    }))
}

pub async fn pages(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let db = ctx.env.d1("DB")?;
    let entries = db::find_all_pages(&db).await?;
    
    let all_deleted = db::find_deleted_entries(&db).await?;
    let deleted_entries = all_deleted.into_iter().filter(|e| e.r#type == "page").collect::<Vec<_>>();
    
    let auth_url = get_auth_url(&ctx.env);
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    Response::from_json(&json!({
        "entries": entries,
        "deleted_entries": deleted_entries,
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled
    }))
}

pub async fn posts(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let db = ctx.env.d1("DB")?;
    
    let all_entries = db::find_all_entries(&db).await?;
    let entries = all_entries.into_iter().filter(|e| e.r#type == "post").collect::<Vec<_>>();
    
    let all_deleted = db::find_deleted_entries(&db).await?;
    let deleted_entries = all_deleted.into_iter().filter(|e| e.r#type == "post").collect::<Vec<_>>();
    
    let auth_url = get_auth_url(&ctx.env);
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    Response::from_json(&json!({
        "entries": entries,
        "deleted_entries": deleted_entries,
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled
    }))
}

pub async fn editor(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let pages = db::find_all_pages(&db).await.unwrap_or_default();
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    let mut initial_type = None;
    if let Ok(url) = req.url() {
        for (k, v) in url.query_pairs() {
            if k == "type" {
                initial_type = Some(v.into_owned());
                break;
            }
        }
    }
    Response::from_json(&json!({
        "entry": null,
        "latest_revision": null,
        "pages": pages,
        "child_pages": [],
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled,
        "initial_type": initial_type
    }))
}

pub async fn editor_id(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = match ctx.param("id") {
        Some(s) => s,
        None => return Response::error("Missing id", 400),
    };

    let db = ctx.env.d1("DB")?;
    let entry = db::find_entry_by_id(&db, id)
        .await?
        .ok_or(zygo_core::error::AppError::NotFound);
    let pages = db::find_all_pages(&db).await.unwrap_or_default();
    let auth_url = get_auth_url(&ctx.env);

    match entry {
        Ok(e) => {
            let child_pages = db::find_all_children(&db, e.id).await.unwrap_or_default();
            let latest_rev = db::find_latest_revision_for_entry(&db, e.id)
                .await
                .unwrap_or(None);
                
            let menus = db::menu::get_all_menus(&db).await?;
            let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
            let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
            
            let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
            
            Response::from_json(&json!({
                "entry": e,
                "latest_revision": latest_rev,
                "pages": pages,
                "child_pages": child_pages,
                "auth_url": auth_url,
                "header_menu": header_menu,
                "footer_menu": footer_menu,
                "analytics_enabled": analytics_enabled
            }))
        }
        Err(err) => err.to_response(),
    }
}

pub async fn navigation(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    Response::from_json(&json!({
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled
    }))
}

pub async fn content_types(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    Response::from_json(&json!({
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu,
        "analytics_enabled": analytics_enabled
    }))
}

pub async fn analytics(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let db = ctx.env.d1("DB")?;
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    let has_cloudflare_tokens = ctx.env.secret("CF_API_TOKEN").is_ok() && ctx.env.var("CF_ZONE_ID").is_ok();
    
    let auth_url = get_auth_url(&ctx.env);
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    Response::from_json(&json!({
        "analytics_enabled": analytics_enabled,
        "has_cloudflare_tokens": has_cloudflare_tokens,
        "auth_url": auth_url,
        "header_menu": header_menu,
        "footer_menu": footer_menu
    }))
}
