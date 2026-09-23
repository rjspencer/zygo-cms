mod admin;
mod auth;
mod cache;
mod db;
mod error;
mod media;
mod models;
mod sanitize;
mod utils;
mod views;
mod handlers;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        // Admin routes
        .get_async("/admin", handlers::admin::dashboard)
        .get_async("/admin/entries", handlers::admin::dashboard)
        .get_async("/admin/editor", handlers::admin::editor)
        .get_async("/admin/editor/:id", handlers::admin::editor_id)
        .get_async("/admin/navigation", handlers::admin::navigation)
        
        // API routes - Menus
        .get_async("/api/menus", handlers::api::get_menus)
        .get_async("/api/menus/:name", handlers::api::get_menu)
        .put_async("/api/menus/:name", handlers::api::put_menu)
        
        // API routes - Media
        .post_async("/api/media", handlers::api::upload_media)
        .get_async("/api/media", handlers::api::list_media)
        .post_async("/api/media/sync", handlers::api::sync_media)
        .delete_async("/api/media/:key", handlers::api::delete_media)
        
        // API routes - Entries
        .get_async("/api/entries", handlers::api::get_entries)
        .get_async("/api/posts", handlers::api::get_posts)
        .post_async("/api/entries", handlers::api::create_entry)
        .put_async("/api/entries/:id", handlers::api::update_entry)
        .delete_async("/api/entries/:id", handlers::api::delete_entry)
        .post_async("/api/entries/:id/restore", handlers::api::restore_entry)
        
        // API routes - Revisions
        .get_async("/api/entries/:id/revisions", handlers::api::get_revisions)
        .get_async("/api/revisions/:id", handlers::api::get_revision)
        
        // Public routes - Media stream
        .get_async("/media/:key", handlers::public::stream_media)
        
        // Public routes - Blog/Pages
        .get_async("/", handlers::public::index)
        .get_async("/sitemap.xml", handlers::public::sitemap)
        .get_async("/rss.xml", handlers::public::rss)
        .get_async("/feed.xml", handlers::public::rss)
        .get_async("/post/:slug", handlers::public::post_reader)
        .get_async("/tag/:tag", handlers::public::tag_archive)
        .get_async("/category/:category", handlers::public::category_archive)
        
        // Preview
        .get_async("/preview/:token", handlers::public::preview)
        
        // Catch-all Page Reader
        .get_async("/*path", handlers::public::page_reader)
        
        .run(req, env)
        .await
}

#[event(scheduled)]
async fn scheduled(event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    worker::console_log!("Scheduled cron triggered: {}", event.cron());
    if let Err(e) = media::sync_r2_to_d1(&env).await {
        worker::console_error!("Scheduled R2-to-D1 sync error: {e}");
    }
}
