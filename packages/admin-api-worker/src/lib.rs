mod auth;
mod cache;
mod media;
mod sanitize;
mod utils;
mod handlers;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let req_url = req.url()?;
    let host = req_url.host_str().unwrap_or("");
    let root_domain = if host.starts_with("api.") {
        host.strip_prefix("api.").unwrap_or(host)
    } else {
        host
    };

    let origin = req.headers().get("Origin")?.unwrap_or_default();
    let is_valid_origin = origin.ends_with(root_domain) 
        || origin.starts_with("http://localhost:") 
        || origin.starts_with("http://127.0.0.1:");
        
    let allowed_origin = if is_valid_origin && !origin.is_empty() {
        origin
    } else {
        format!("https://admin.{}", root_domain)
    };
    
    let cors = Cors::new()
        .with_credentials(true)
        .with_origins(vec![allowed_origin])
        .with_allowed_headers(vec!["*"])
        .with_methods(vec![Method::Get, Method::Post, Method::Put, Method::Delete, Method::Options]);

    let router = Router::new()
        // Admin routes
        .get_async("/api/admin/dashboard", handlers::admin::dashboard)
        .get_async("/api/admin/pages", handlers::admin::pages)
        .get_async("/api/admin/posts", handlers::admin::posts)
        .get_async("/api/admin/editor", handlers::admin::editor)
        .get_async("/api/admin/editor/:id", handlers::admin::editor_id)
        .get_async("/api/admin/navigation", handlers::admin::navigation)
        .get_async("/api/admin/section-templates", handlers::admin::section_templates)
        .get_async("/api/admin/content-types", handlers::admin::content_types)
        .get_async("/api/admin/analytics", handlers::admin::analytics)
        .get_async("/api/settings", handlers::api::get_settings)
        .post_async("/api/settings", handlers::api::update_setting)
        .get_async("/api/analytics", handlers::api::get_analytics)
        .get_async("/api/me", handlers::api::get_me)
        .get_async("/api/auth/login", handlers::api::auth_login)
        
        // Admin API routes - Users
        .get_async("/api/admin/users", handlers::users::list_users)
        .post_async("/api/admin/users", handlers::users::create_user)
        .put_async("/api/admin/users/:id", handlers::users::update_user)
        .delete_async("/api/admin/users/:id", handlers::users::delete_user)
        
        // API routes - Menus
        .get_async("/api/menus", handlers::api::get_menus)
        .get_async("/api/menus/:name", handlers::api::get_menu)
        .put_async("/api/menus/:name", handlers::api::put_menu)
        
        // API routes - Section Templates
        .get_async("/api/section-templates", handlers::section_templates::list_section_templates)
        .post_async("/api/section-templates", handlers::section_templates::upsert_section_template)
        .get_async("/api/section-templates/:id", handlers::section_templates::get_section_template)
        .post_async("/api/section-templates/:id", handlers::section_templates::upsert_section_template)
        .put_async("/api/section-templates/:id", handlers::section_templates::upsert_section_template)
        .delete_async("/api/section-templates/:id", handlers::section_templates::delete_section_template)

        // Backwards compatibility aliases for Content Types
        .get_async("/api/content-types", handlers::section_templates::list_section_templates)
        .post_async("/api/content-types", handlers::section_templates::upsert_section_template)
        .get_async("/api/content-types/:id", handlers::section_templates::get_section_template)
        .post_async("/api/content-types/:id", handlers::section_templates::upsert_section_template)
        .put_async("/api/content-types/:id", handlers::section_templates::upsert_section_template)
        .delete_async("/api/content-types/:id", handlers::section_templates::delete_section_template)
        
        // API routes - Media
        .post_async("/api/media", handlers::api::upload_media)
        .get_async("/api/media", handlers::api::list_media)
        .post_async("/api/media/sync", handlers::api::sync_media)
        .delete_async("/api/media/:key", handlers::api::delete_media)
        .get_async("/media/:key", handlers::api::stream_media)
        .get_async("/api/media/:key", handlers::api::stream_media)
        
        // API routes - Entries
        .get_async("/api/search", handlers::api::search_entries_api)
        .get_async("/api/entries", handlers::api::get_entries)
        .get_async("/api/posts", handlers::api::get_posts)
        .post_async("/api/entries", handlers::api::create_entry)
        .put_async("/api/entries/:id", handlers::api::update_entry)
        .delete_async("/api/entries/:id", handlers::api::delete_entry)
        .post_async("/api/entries/:id/restore", handlers::api::restore_entry)
        
        // API routes - Revisions
        .get_async("/api/entries/:id/revisions", handlers::api::get_revisions)
        .get_async("/api/revisions/:id", handlers::api::get_revision)

        // Preview routes
        .get_async("/preview/:token", handlers::api::preview)
        .get_async("/api/preview/:token", handlers::api::preview)
        
        // CORS preflight catch-all
        .options("/*catchall", |_, _| Response::empty());

    match router.run(req, env).await {
        Ok(res) => Ok(res.with_cors(&cors)?),
        Err(e) => Err(e),
    }
}

#[event(scheduled)]
async fn scheduled(event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    worker::console_log!("Scheduled cron triggered: {}", event.cron());
    
    // Offset by 1 second as requested
    worker::Delay::from(std::time::Duration::from_secs(1)).await;
    
    // Handle Scheduled Publishing
    if let Ok(db) = env.d1("DB") {
        match zygo_core::db::entry::publish_scheduled_entries(&db).await {
            Ok(published) => {
                if !published.is_empty() {
                    worker::console_log!("Published {} scheduled entries.", published.len());
                    let mut urls_to_purge = vec!["/".to_string(), "/rss.xml".to_string(), "/sitemap.xml".to_string()];
                    for entry in published {
                        urls_to_purge.push(entry.path());
                    }
                    cache::purge_urls(&env, urls_to_purge).await;
                }
            }
            Err(e) => worker::console_error!("Failed to check scheduled entries: {e}"),
        }
    }

    // Handle Media Sync
    if event.cron() == "0 0 * * 0" {
        if let Err(e) = media::sync_r2_to_d1(&env).await {
            worker::console_error!("Scheduled R2-to-D1 sync error: {e}");
        }
    }
}
