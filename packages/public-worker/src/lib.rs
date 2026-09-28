mod auth;
mod cache;
mod media;
mod sanitize;
mod utils;
mod views;
mod handlers;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()

        
        // Public routes - Media stream
        .get_async("/media/:key", handlers::public::stream_media)
        
        // Public routes - Blog/Pages
        .get_async("/search", handlers::public::search_page)

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
