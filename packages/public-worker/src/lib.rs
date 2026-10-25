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

        
        // Dynamic Stylesheet with Cache Busting
        .get_async("/style-:hash.css", handlers::public::serve_styles)
        .get_async("/style.css", handlers::public::serve_styles)

        // Favicon handler
        .get_async("/favicon.ico", handlers::public::serve_favicon)

        // Form submission endpoint
        .post_async("/forms/submit", handlers::public::submit_form)

        // Public routes - Media stream
        .get_async("/media/:key", handlers::public::stream_media)
        
        // Public routes - Blog/Pages
        .get_async("/search", handlers::public::search_page)

        .get_async("/", handlers::public::root_page)
        .get_async("/posts", handlers::public::posts_index)
        .get_async("/post", handlers::public::posts_index)
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

        // CORS preflight catch-all
        .options("/*catchall", handlers::public::options_preflight)
        
        .run(req, env)
        .await
}

/// Resolves the canonical origin without a request (cron): DB `canonical_origin` setting, then env.
async fn scheduled_origin(db: &D1Database, env: &Env) -> String {
    if let Ok(Some(setting)) = zygo_core::db::setting::get_setting(db, "canonical_origin").await {
        let v = setting.value.trim().trim_end_matches('/');
        if !v.is_empty() {
            return v.to_string();
        }
    }
    env.var("CANONICAL_ORIGIN")
        .or_else(|_| env.var("SITE_URL"))
        .map(|v| v.to_string().trim().trim_end_matches('/').to_string())
        .unwrap_or_default()
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
                    let origin = scheduled_origin(&db, &env).await;
                    let mut paths = vec![
                        "/".to_string(),
                        "/posts".to_string(),
                        "/post".to_string(),
                        "/rss.xml".to_string(),
                        "/feed.xml".to_string(),
                        "/sitemap.xml".to_string(),
                    ];
                    for entry in published {
                        paths.push(entry.path());
                    }
                    let mut urls_to_purge = paths.clone();
                    if !origin.is_empty() {
                        urls_to_purge.extend(paths.iter().map(|p| format!("{}{}", origin, p)));
                    } else {
                        worker::console_error!("Scheduled purge: no canonical origin configured; only local cache cleared");
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
