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
            let db = ctx.env.d1("DB")?;
            let pages = db::find_all_pages(&db).await.unwrap_or_default();
            let html = admin::render_editor_html(None, &pages, &auth_url)?;
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
            let pages = db::find_all_pages(&db).await.unwrap_or_default();
            let auth_url = get_auth_url(&ctx.env);

            match entry {
                Ok(e) => {
                    let html = admin::render_editor_html(Some(&e), &pages, &auth_url)?;
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
        // Public Tag Archive
        .get_async("/tag/:tag", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let tag = match ctx.param("tag") {
                Some(t) => t,
                None => return Response::error("Missing tag", 400),
            };

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let posts = db::find_published_posts_by_tag(&db, tag).await?;
            let html = views::render_tag_index(&posts, &origin, tag)?;

            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        // Public Category Archive
        .get_async("/category/:category", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let category = match ctx.param("category") {
                Some(c) => c,
                None => return Response::error("Missing category", 400),
            };

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let posts = db::find_published_posts_by_category(&db, category).await?;
            let html = views::render_category_index(&posts, &origin, category)?;

            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
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

            let mut payload = match req.json::<CreateEntryRequest>().await {
                Ok(p) => p,
                Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
            };

            if let Err(err) = payload.validate() {
                return err.to_response();
            }

            payload.body_html = sanitize::sanitize_html(&payload.body_html);

            let db = ctx.env.d1("DB")?;
            let entry_path = if payload.r#type.as_deref() == Some("page") {
                if let Some(pid) = payload.parent_id {
                    let parent = db::find_entry_by_id(&db, &pid.to_string()).await?;
                    parent
                        .map(|p| {
                            format!(
                                "{}/{}",
                                p.path().trim_end_matches('/'),
                                payload.slug.trim_start_matches('/')
                            )
                        })
                        .unwrap_or_else(|| format!("/{}", payload.slug))
                } else {
                    format!("/{}", payload.slug)
                }
            } else {
                format!("/post/{}", payload.slug)
            };

            if let Err(e) = db::create_entry(&db, &payload).await {
                return Response::error(e.to_string(), 400);
            }

            let origin = req.url()?.origin().ascii_serialization();

            // Immediate cache invalidation in the background
            let mut purge_list = vec![
                format!("{}/", origin),
                format!("{}{}", origin, entry_path),
                format!("{}/sitemap.xml", origin),
                format!("{}/rss.xml", origin),
                format!("{}/feed.xml", origin),
            ];
            if let Some(ref cat) = payload.category {
                let trimmed = cat.trim();
                if !trimmed.is_empty() {
                    purge_list.push(format!("{}/category/{}", origin, trimmed));
                }
            }
            if let Some(ref tags) = payload.tags {
                for tag in tags.split(',') {
                    let trimmed = tag.trim();
                    if !trimmed.is_empty() {
                        purge_list.push(format!("{}/tag/{}", origin, trimmed));
                    }
                }
            }
            cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&json!({ "success": true, "slug": payload.slug }))
        })
        .put_async("/entries/:id", |mut req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");

            let mut payload = match req.json::<UpdateEntryRequest>().await {
                Ok(p) => p,
                Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
            };

            if let Err(err) = payload.validate() {
                return err.to_response();
            }

            if let Some(ref mut html) = payload.body_html {
                *html = sanitize::sanitize_html(html);
            }

            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            let update_result = db::update_entry(&db, id, &payload).await;

            let _updated = match update_result {
                Ok(true) => true,
                Ok(false) => return AppError::NotFound.to_response(),
                Err(e) => return Response::error(e.to_string(), 400),
            };

            // Immediate cache invalidation in the background
            let origin = req.url()?.origin().ascii_serialization();
            let mut purge_list = vec![
                format!("{}/", origin),
                format!("{}/sitemap.xml", origin),
                format!("{}/rss.xml", origin),
                format!("{}/feed.xml", origin),
            ];
            if let Some(ref entry) = existing_entry {
                purge_list.push(format!("{}{}", origin, entry.path()));
                let old_prefix = format!("{}/", entry.path());
                let all_entries = db::find_all_entries(&db).await.unwrap_or_default();
                for e in all_entries {
                    if e.path().starts_with(&old_prefix) {
                        purge_list.push(format!("{}{}", origin, e.path()));
                    }
                }
                if let Some(ref cat) = entry.category {
                    purge_list.push(format!("{}/category/{}", origin, cat.trim()));
                }
                for tag in entry.tag_list() {
                    purge_list.push(format!("{}/tag/{}", origin, tag));
                }
            }
            if let Some(updated_entry) = db::find_entry_by_id(&db, id).await? {
                purge_list.push(format!("{}{}", origin, updated_entry.path()));
            }
            if let Some(ref cat) = payload.category {
                purge_list.push(format!("{}/category/{}", origin, cat.trim()));
            }
            if let Some(ref tags) = payload.tags {
                for tag in tags.split(',') {
                    let trimmed = tag.trim();
                    if !trimmed.is_empty() {
                        purge_list.push(format!("{}/tag/{}", origin, trimmed));
                    }
                }
            }
            cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&json!({ "success": true, "id": id }))
        })
        .delete_async("/entries/:id", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");
            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            let delete_result = db::delete_entry(&db, id).await;

            let _deleted = match delete_result {
                Ok(true) => true,
                Ok(false) => return AppError::NotFound.to_response(),
                Err(e) => return Response::error(e.to_string(), 400),
            };

            // Immediate cache invalidation in the background
            let origin = req.url()?.origin().ascii_serialization();
            let mut purge_list = vec![
                format!("{}/", origin),
                format!("{}/sitemap.xml", origin),
                format!("{}/rss.xml", origin),
                format!("{}/feed.xml", origin),
            ];
            if let Some(ref entry) = existing_entry {
                purge_list.push(format!("{}{}", origin, entry.path()));
                if let Some(ref cat) = entry.category {
                    purge_list.push(format!("{}/category/{}", origin, cat.trim()));
                }
                for tag in entry.tag_list() {
                    purge_list.push(format!("{}/tag/{}", origin, tag));
                }
            }
            cache::purge_urls(&ctx.env, purge_list).await;

            Response::from_json(&json!({ "success": true, "deleted": id }))
        })
        // Public Page Reader (supports nested hierarchy e.g. /about, /about/team)
        .get_async("/*path", |req, ctx| async move {
            if let Some(cached) = cache::get_cached(&req).await {
                return Ok(cached);
            }

            let path_param = match ctx.param("path") {
                Some(s) => s,
                None => return Response::error("Missing path", 400),
            };

            let normalized_path = if path_param.starts_with('/') {
                path_param.to_string()
            } else {
                format!("/{}", path_param)
            };

            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;
            let page = db::find_published_page_by_path(&db, &normalized_path)
                .await?
                .ok_or(AppError::NotFound);

            match page {
                Ok(p) => {
                    let breadcrumbs = db::find_page_ancestors(&db, p.id).await.unwrap_or_default();
                    let children = db::find_published_children(&db, p.id)
                        .await
                        .unwrap_or_default();
                    let html = views::render_page(&p, &origin, &breadcrumbs, &children)?;
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
