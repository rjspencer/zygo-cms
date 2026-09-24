use worker::*;
use crate::{admin, db};
use crate::utils::get_auth_url;

pub async fn dashboard(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
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

    let html = admin::render_dashboard_html(page_count, post_count, author_count, &auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn pages(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let entries = db::find_all_pages(&db).await?;
    // We don't have find_deleted_pages, but we can reuse find_deleted_entries and filter in UI or create a db method. Let's just create find_deleted_pages.
    // Actually, find_deleted_entries returns all deleted entries. We can filter in Rust.
    let all_deleted = db::find_deleted_entries(&db).await?;
    let deleted_entries = all_deleted.into_iter().filter(|e| e.r#type == "page").collect::<Vec<_>>();
    
    let auth_url = get_auth_url(&ctx.env);
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    let html = admin::render_pages_html(&entries, &deleted_entries, &auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn posts(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    // Wait, find_all_posts doesn't exist? There's find_published_posts, but admin needs all.
    // Let's look at what we have for fetching entries. We have find_all_entries. Let's filter it.
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

    let html = admin::render_posts_html(&entries, &deleted_entries, &auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn editor(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let pages = db::find_all_pages(&db).await.unwrap_or_default();
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    let html = admin::render_editor_html(None, None, &pages, &[], &auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn editor_id(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let id = match ctx.param("id") {
        Some(s) => s,
        None => return Response::error("Missing id", 400),
    };

    let db = ctx.env.d1("DB")?;
    let entry = db::find_entry_by_id(&db, id)
        .await?
        .ok_or(crate::error::AppError::NotFound);
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
            
            let html = admin::render_editor_html(
                Some(&e),
                latest_rev.as_ref(),
                &pages,
                &child_pages,
                &auth_url,
                &header_menu,
                &footer_menu,
                db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false),
            )?;
            Response::from_html(html)
        }
        Err(err) => err.to_response(),
    }
}

pub async fn navigation(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    let html = admin::render_navigation_html(&auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn content_types(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let auth_url = get_auth_url(&ctx.env);
    let db = ctx.env.d1("DB")?;
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?.map(|s| s.value == "true").unwrap_or(false);
    let html = admin::render_content_types_html(&auth_url, &header_menu, &footer_menu, analytics_enabled)?;
    Response::from_html(html)
}

pub async fn analytics(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    
    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled").await?
        .map(|s| s.value == "true")
        .unwrap_or(false);

    let has_cloudflare_tokens = ctx.env.secret("CF_API_TOKEN").is_ok() && ctx.env.var("CF_ZONE_ID").is_ok();
    
    let auth_url = get_auth_url(&ctx.env);
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = admin::render_analytics_html(
        analytics_enabled, 
        has_cloudflare_tokens, 
        &auth_url, 
        &header_menu, 
        &footer_menu
    )?;
    Response::from_html(html)
}
