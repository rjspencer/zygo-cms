mod auth;
mod cache;
mod media;
mod sanitize;
mod utils;
mod handlers;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        // Admin routes
        .get_async("/api/admin/dashboard", handlers::admin::dashboard)
        .get_async("/api/admin/pages", handlers::admin::pages)
        .get_async("/api/admin/posts", handlers::admin::posts)
        .get_async("/api/admin/editor", handlers::admin::editor)
        .get_async("/api/admin/editor/:id", handlers::admin::editor_id)
        .get_async("/api/admin/navigation", handlers::admin::navigation)
        .get_async("/api/admin/content-types", handlers::admin::content_types)
        .get_async("/api/admin/analytics", handlers::admin::analytics)
        .post_async("/api/settings", handlers::api::update_setting)
        .get_async("/api/analytics", handlers::api::get_analytics)
        .get_async("/api/me", handlers::api::get_me)
        
        // API routes - Menus
        .get_async("/api/menus", handlers::api::get_menus)
        .get_async("/api/menus/:name", handlers::api::get_menu)
        .put_async("/api/menus/:name", handlers::api::put_menu)
        
        // API routes - Content Types
        .get_async("/api/content-types", handlers::content_type::list_content_types)
        .get_async("/api/content-types/:id", handlers::content_type::get_content_type)
        .post_async("/api/content-types/:id", handlers::content_type::upsert_content_type)
        .put_async("/api/content-types/:id", handlers::content_type::upsert_content_type)
        .delete_async("/api/content-types/:id", handlers::content_type::delete_content_type)
        
        // API routes - Media
        .post_async("/api/media", handlers::api::upload_media)
        .get_async("/api/media", handlers::api::list_media)
        .post_async("/api/media/sync", handlers::api::sync_media)
        .delete_async("/api/media/:key", handlers::api::delete_media)
        
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
        

        
        .run(req, env)
        .await
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
