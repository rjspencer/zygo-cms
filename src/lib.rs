mod admin;
mod auth;
mod cache;
mod db;
mod error;
mod media;
mod models;
mod utils;
mod views;

use error::AppError;
use models::{CreateEntryRequest, UpdateEntryRequest};
use serde_json::json;
use utils::get_auth_url;
use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        // Admin
        .get_async("/admin", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let entries = db::find_all_entries(&db).await?;
            let auth_url = get_auth_url(&ctx.env);
            let html = admin::render_dashboard_html(&entries, &auth_url)?;
            Response::from_html(html)
        })
        .get_async("/admin/entries", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let entries = db::find_all_entries(&db).await?;
            let auth_url = get_auth_url(&ctx.env);
            let html = admin::render_dashboard_html(&entries, &auth_url)?;
            Response::from_html(html)
        })
        .get_async("/admin/editor", |_req, ctx| async move {
            let auth_url = get_auth_url(&ctx.env);
            let html = admin::render_editor_html(None, &auth_url)?;
            Response::from_html(html)
        })
        .get_async("/admin/editor/:id", |_req, ctx| async move {
            let id = match ctx.param("id") {
                Some(s) => s,
                None => return Response::error("Missing id", 400),
            };

            let db = ctx.env.d1("DB")?;
            let entry = db::find_entry_by_id(&db, id)
                .await?
                .ok_or(AppError::NotFound);
            let auth_url = get_auth_url(&ctx.env);

            match entry {
                Ok(e) => {
                    let html = admin::render_editor_html(Some(&e), &auth_url)?;
                    Response::from_html(html)
                }
                Err(err) => err.to_response(),
            }
        })
        // Upload image to R2
        .post_async("/api/media", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            media::upload_media(req, &ctx).await
        })
        // List media from R2
        .get_async("/api/media", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            media::list_media(&ctx).await
        })
        // Delete image from R2
        .delete_async("/api/media/:key", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            let key = match ctx.param("key") {
                Some(k) => k,
                None => return Response::error("Missing key", 400),
            };
            media::delete_media(key, &ctx).await
        })
        // Stream image from R2
        .get_async("/media/:key", |_req, ctx| async move {
            let key = match ctx.param("key") {
                Some(k) => k,
                None => return Response::error("Missing key", 400),
            };
            media::get_media(key, &ctx).await
        })
        // Public Blog Index
        .get_async("/", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let posts = db::find_published_posts(&db).await?;
            let html = views::render_index(&posts, &origin)?;

            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        // Dynamic Sitemap
        .get_async("/sitemap.xml", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let entries = db::find_published_entries(&db).await?;
            let mut res = views::render_sitemap(&origin, &entries, &ctx.env)?;
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        // Dynamic RSS Feed (also aliased to /feed.xml)
        .get_async("/rss.xml", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let posts = db::find_published_posts(&db).await?;
            let mut res = views::render_rss(&origin, &posts, &ctx.env)?;
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        .get_async("/feed.xml", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let posts = db::find_published_posts(&db).await?;
            let mut res = views::render_rss(&origin, &posts, &ctx.env)?;
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        // Public Single Post Reader
        .get_async("/post/:slug", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let slug = match ctx.param("slug") {
                Some(s) => s,
                None => return Response::error("Missing slug", 400),
            };

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let post = db::find_published_post_by_slug(&db, slug)
                .await?
                .ok_or(AppError::NotFound);

            match post {
                Ok(p) => {
                    let html = views::render_post(&p, &origin)?;
                    let mut headers = Headers::new();
                    headers.set("Content-Type", "text/html; charset=utf-8")?;
                    cache::add_cache_headers(&mut headers, &ctx.env)?;

                    let mut res = Response::ok(html)?.with_headers(headers);
                    cache::put_cached(&req, &mut res).await;
                    Ok(res)
                }
                Err(err) => err.to_response(),
            }
        })
        // Entries API (also supports /posts as alias)
        .get_async("/entries", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let entries = db::find_all_entries(&db).await?;
            Response::from_json(&entries)
        })
        .get_async("/posts", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let entries = db::find_published_posts(&db).await?;
            Response::from_json(&entries)
        })
        .post_async("/entries", |mut req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let payload = match req.json::<CreateEntryRequest>().await {
                Ok(p) => p,
                Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
            };

            if let Err(err) = payload.validate() {
                return err.to_response();
            }

            let origin = req.url()?.origin().ascii_serialization();
            let entry_path = if payload.r#type.as_deref() == Some("page") {
                format!("/{}", payload.slug)
            } else {
                format!("/post/{}", payload.slug)
            };

            let db = ctx.env.d1("DB")?;
            db::create_entry(&db, &payload).await?;

            // Immediate cache invalidation in the background
            cache::purge_urls(
                &ctx.env,
                vec![
                    format!("{}/", origin),
                    format!("{}{}", origin, entry_path),
                    format!("{}/sitemap.xml", origin),
                    format!("{}/rss.xml", origin),
                    format!("{}/feed.xml", origin),
                ],
            )
            .await;

            Response::from_json(&json!({ "success": true, "slug": payload.slug }))
        })
        .put_async("/entries/:id", |mut req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");

            let payload = match req.json::<UpdateEntryRequest>().await {
                Ok(p) => p,
                Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
            };

            if let Err(err) = payload.validate() {
                return err.to_response();
            }

            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            let updated = db::update_entry(&db, id, &payload).await?;

            if !updated {
                return AppError::NotFound.to_response();
            }

            // Immediate cache invalidation in the background
            let origin = req.url()?.origin().ascii_serialization();
            let mut purge_list = vec![
                format!("{}/", origin),
                format!("{}/sitemap.xml", origin),
                format!("{}/rss.xml", origin),
                format!("{}/feed.xml", origin),
            ];
            if let Some(entry) = existing_entry {
                purge_list.push(format!("{}{}", origin, entry.path()));
            }
            cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&json!({ "success": true, "id": id }))
        })
        .delete_async("/entries/:id", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");
            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            let deleted = db::delete_entry(&db, id).await?;

            if !deleted {
                return AppError::NotFound.to_response();
            }

            // Immediate cache invalidation in the background
            let origin = req.url()?.origin().ascii_serialization();
            let mut purge_list = vec![
                format!("{}/", origin),
                format!("{}/sitemap.xml", origin),
                format!("{}/rss.xml", origin),
                format!("{}/feed.xml", origin),
            ];
            if let Some(entry) = existing_entry {
                purge_list.push(format!("{}{}", origin, entry.path()));
            }
            cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&json!({ "success": true, "deleted": id }))
        })
        // Public Single Page Reader
        .get_async("/:slug", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let slug = match ctx.param("slug") {
                Some(s) => s,
                None => return Response::error("Missing slug", 400),
            };

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let page = db::find_published_page_by_slug(&db, slug)
                .await?
                .ok_or(AppError::NotFound);

            match page {
                Ok(p) => {
                    let html = views::render_page(&p, &origin)?;
                    let mut headers = Headers::new();
                    headers.set("Content-Type", "text/html; charset=utf-8")?;
                    cache::add_cache_headers(&mut headers, &ctx.env)?;

                    let mut res = Response::ok(html)?.with_headers(headers);
                    cache::put_cached(&req, &mut res).await;
                    Ok(res)
                }
                Err(err) => err.to_response(),
            }
        })
        .run(req, env)
        .await
}
