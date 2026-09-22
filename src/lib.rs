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
            let deleted_entries = db::find_deleted_entries(&db).await?;
            let auth_url = get_auth_url(&ctx.env);
            let html = admin::render_dashboard_html(&entries, &deleted_entries, &auth_url)?;
            Response::from_html(html)
        })
        .get_async("/admin/entries", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let entries = db::find_all_entries(&db).await?;
            let deleted_entries = db::find_deleted_entries(&db).await?;
            let auth_url = get_auth_url(&ctx.env);
            let html = admin::render_dashboard_html(&entries, &deleted_entries, &auth_url)?;
            Response::from_html(html)
        })
        .get_async("/admin/editor", |_req, ctx| async move {
            let auth_url = get_auth_url(&ctx.env);
            let db = ctx.env.d1("DB")?;
            let pages = db::find_all_pages(&db).await.unwrap_or_default();
            let html = admin::render_editor_html(None, None, &pages, &[], &auth_url)?;
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
                    let child_pages = db::find_all_children(&db, e.id).await.unwrap_or_default();
                    let latest_rev = db::find_latest_revision_for_entry(&db, e.id)
                        .await
                        .unwrap_or(None);
                    let html = admin::render_editor_html(
                        Some(&e),
                        latest_rev.as_ref(),
                        &pages,
                        &child_pages,
                        &auth_url,
                    )?;
                    Response::from_html(html)
                }
                Err(err) => err.to_response(),
            }
        })
        // Upload image to R2 and index in D1
        .post_async("/api/media", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            media::upload_media(req, &ctx).await
        })
        // List media with search, sorting, and pagination
        .get_async("/api/media", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            media::list_media(&req, &ctx).await
        })
        // Sync R2 bucket contents into D1 index
        .post_async("/api/media/sync", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            match media::sync_r2_to_d1(&ctx.env).await {
                Ok(report) => Response::from_json(&report),
                Err(err) => Response::error(format!("Media sync failed: {err}"), 500),
            }
        })
        // Delete image from D1 and R2
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

            let page = utils::parse_page_param(&req);
            let per_page = utils::get_page_size(&ctx.env);
            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;

            let total_posts = db::count_published_posts(&db).await?;
            let pagination = models::Pagination::new("/", page, per_page, total_posts);
            let offset = (pagination.page - 1) * per_page;
            let posts = db::find_published_posts_paginated(&db, per_page, offset).await?;
            let html = views::render_index(&posts, &origin, Some(pagination))?;

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

            let page = utils::parse_page_param(&req);
            let per_page = utils::get_page_size(&ctx.env);
            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;

            let total_posts = db::count_published_posts_by_tag(&db, tag).await?;
            let base_path = format!("/tag/{tag}");
            let pagination = models::Pagination::new(&base_path, page, per_page, total_posts);
            let offset = (pagination.page - 1) * per_page;
            let posts =
                db::find_published_posts_by_tag_paginated(&db, tag, per_page, offset).await?;
            let html = views::render_tag_index(&posts, &origin, tag, Some(pagination))?;

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

            let page = utils::parse_page_param(&req);
            let per_page = utils::get_page_size(&ctx.env);
            let origin = utils::get_canonical_origin(&req, &ctx.env);
            let db = ctx.env.d1("DB")?;

            let total_posts = db::count_published_posts_by_category(&db, category).await?;
            let base_path = format!("/category/{category}");
            let pagination = models::Pagination::new(&base_path, page, per_page, total_posts);
            let offset = (pagination.page - 1) * per_page;
            let posts =
                db::find_published_posts_by_category_paginated(&db, category, per_page, offset)
                    .await?;
            let html = views::render_category_index(&posts, &origin, category, Some(pagination))?;

            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        })
        // Entries API (also supports /posts as alias)
        .get_async("/entries", |req, ctx| async move {
            let url = req.url()?;
            let filter = url.query_pairs().find(|(k, _)| k == "filter").map(|(_, v)| v.to_string());
            let db = ctx.env.d1("DB")?;
            let entries = if filter.as_deref() == Some("trash") {
                db::find_deleted_entries(&db).await?
            } else {
                db::find_all_entries(&db).await?
            };
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
            payload.author_id = Some(_user.id);

            if let Err(err) = payload.validate() {
                return err.to_response();
            }

            payload.body_html = sanitize::sanitize_html(&payload.body_html);

            let db = ctx.env.d1("DB")?;

            // Check slug conflict
            if let Ok(Some(existing)) = db::find_entry_by_slug(&db, &payload.slug).await {
                if existing.deleted_at.is_some() {
                    return AppError::BadRequest(format!(
                        "An entry with slug '{}' already exists in the Trash. Please restore it or remove it via SQL to reuse this slug.",
                        payload.slug
                    )).to_response();
                } else {
                    return AppError::BadRequest(format!(
                        "An entry with slug '{}' already exists.",
                        payload.slug
                    )).to_response();
                }
            }

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

            let entry_id = match db::create_entry(&db, &payload).await {
                Ok(id) => id,
                Err(e) => return Response::error(e.to_string(), 400),
            };

            let preview_token = utils::generate_preview_token();
            let rev_params = models::CreateRevisionParams {
                title: payload.title.clone(),
                description: payload.description.clone(),
                cover_image: payload.cover_image.clone(),
                body_html: payload.body_html.clone(),
                body_json: payload.body_json.clone(),
                category: payload.category.clone(),
                tags: payload.tags.clone(),
            };
            let _ = db::create_revision(&db, entry_id, &rev_params, &preview_token).await;

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

            Response::from_json(&json!({
                "success": true,
                "id": entry_id,
                "slug": payload.slug,
                "preview_token": preview_token
            }))
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
            let is_draft_only = payload.draft_only.unwrap_or(false);
            let num_id = match id.parse::<i64>() {
                Ok(n) => n,
                Err(_) => return Response::error("Invalid entry id", 400),
            };

            if is_draft_only {
                let existing_entry = match db::find_entry_by_id(&db, id).await? {
                    Some(e) => e,
                    None => return AppError::NotFound.to_response(),
                };

                if _user.role == "author" && existing_entry.author_id != Some(_user.id) {
                    return AppError::Unauthorized("You do not have permission to edit this entry".into()).to_response();
                }

                let preview_token = utils::generate_preview_token();
                let rev_params = models::CreateRevisionParams {
                    title: payload.title.unwrap_or(existing_entry.title),
                    description: payload.description.or(existing_entry.description),
                    cover_image: payload.cover_image.or(existing_entry.cover_image),
                    body_html: payload.body_html.unwrap_or(existing_entry.body_html),
                    body_json: payload.body_json.unwrap_or(existing_entry.body_json),
                    category: payload.category.or(existing_entry.category),
                    tags: payload.tags.or(existing_entry.tags),
                };
                let rev_id = db::create_revision(&db, num_id, &rev_params, &preview_token).await?;

                return Response::from_json(&json!({
                    "success": true,
                    "id": id,
                    "preview_token": preview_token,
                    "draft_only": true,
                    "revision_id": rev_id,
                }));
            }

            let existing_entry = db::find_entry_by_id(&db, id).await?;
            if let Some(ref e) = existing_entry {
                if _user.role == "author" && e.author_id != Some(_user.id) {
                    return AppError::Unauthorized("You do not have permission to edit this entry".into()).to_response();
                }
            }
            let update_result = db::update_entry(&db, id, &payload).await;

            let _updated = match update_result {
                Ok(true) => true,
                Ok(false) => return AppError::NotFound.to_response(),
                Err(e) => return Response::error(e.to_string(), 400),
            };

            let preview_token = utils::generate_preview_token();
            if let Some(updated_entry) = db::find_entry_by_id(&db, id).await? {
                let rev_params = models::CreateRevisionParams {
                    title: updated_entry.title.clone(),
                    description: updated_entry.description.clone(),
                    cover_image: updated_entry.cover_image.clone(),
                    body_html: updated_entry.body_html.clone(),
                    body_json: updated_entry.body_json.clone(),
                    category: updated_entry.category.clone(),
                    tags: updated_entry.tags.clone(),
                };
                let _ = db::create_revision(&db, num_id, &rev_params, &preview_token).await;
            }

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

            Response::from_json(&json!({
                "success": true,
                "id": id,
                "preview_token": preview_token,
                "draft_only": false
            }))
        })
        .delete_async("/entries/:id", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");
            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            if let Some(ref e) = existing_entry {
                if _user.role == "author" && e.author_id != Some(_user.id) {
                    return AppError::Unauthorized("You do not have permission to delete this entry".into()).to_response();
                }
            }
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

            Response::from_json(&json!({ "success": true, "deleted": id, "soft_deleted": true }))
        })
        .post_async("/entries/:id/restore", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);

            let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");
            let db = ctx.env.d1("DB")?;
            let existing_entry = db::find_entry_by_id(&db, id).await?;
            if let Some(ref e) = existing_entry {
                if _user.role == "author" && e.author_id != Some(_user.id) {
                    return AppError::Unauthorized("You do not have permission to restore this entry".into()).to_response();
                }
            }
            let restore_result = db::restore_entry(&db, id).await;

            match restore_result {
                Ok(true) => {},
                Ok(false) => return AppError::NotFound.to_response(),
                Err(e) => return Response::error(e.to_string(), 400),
            };

            if let Some(ref entry) = existing_entry {
                if entry.status == "published" {
                    let origin = req.url()?.origin().ascii_serialization();
                    let mut purge_list = vec![
                        format!("{}/", origin),
                        format!("{}{}", origin, entry.path()),
                        format!("{}/sitemap.xml", origin),
                        format!("{}/rss.xml", origin),
                        format!("{}/feed.xml", origin),
                    ];
                    if let Some(ref cat) = entry.category {
                        purge_list.push(format!("{}/category/{}", origin, cat.trim()));
                    }
                    for tag in entry.tag_list() {
                        purge_list.push(format!("{}/tag/{}", origin, tag));
                    }
                    cache::purge_urls(&ctx.env, purge_list).await;
                }
            }

            Response::from_json(&json!({ "success": true, "restored": id }))
        })
        // Revisions API
        .get_async("/api/entries/:id/revisions", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            let id = match ctx.param("id") {
                Some(s) => s,
                None => return Response::error("Missing id", 400),
            };
            let num_id = match id.parse::<i64>() {
                Ok(n) => n,
                Err(_) => return Response::error("Invalid id", 400),
            };

            let db = ctx.env.d1("DB")?;
            let revisions = db::find_revisions_by_entry_id(&db, num_id).await?;
            Response::from_json(&revisions)
        })
        .get_async("/api/revisions/:id", |req, ctx| async move {
            let _user = auth_required!(&req, ctx);
            let id = match ctx.param("id") {
                Some(s) => s,
                None => return Response::error("Missing id", 400),
            };
            let num_id = match id.parse::<i64>() {
                Ok(n) => n,
                Err(_) => return Response::error("Invalid id", 400),
            };

            let db = ctx.env.d1("DB")?;
            let revision = db::find_revision_by_id(&db, num_id).await?;
            match revision {
                Some(r) => Response::from_json(&r),
                None => AppError::NotFound.to_response(),
            }
        })
        // Tokenized Preview Reader (bypasses cache)
        .get_async("/preview/:token", |req, ctx| async move {
            let token = match ctx.param("token") {
                Some(t) => t,
                None => return Response::error("Missing token", 400),
            };

            let db = ctx.env.d1("DB")?;
            let origin = utils::get_canonical_origin(&req, &ctx.env);

            let revision = db::find_revision_by_token(&db, token).await?;
            let rev = match revision {
                Some(r) => r,
                None => return AppError::NotFound.to_response(),
            };

            let base_entry = db::find_entry_by_id(&db, &rev.entry_id.to_string()).await?;
            let entry = match base_entry {
                Some(e) => e,
                None => return AppError::NotFound.to_response(),
            };

            let preview_entry = models::Entry {
                id: entry.id,
                slug: entry.slug.clone(),
                title: rev.title.clone(),
                r#type: entry.r#type.clone(),
                status: "preview".to_string(),
                description: rev.description.clone(),
                cover_image: rev.cover_image.clone().or_else(|| entry.cover_image.clone()),
                canonical_url: entry.canonical_url.clone(),
                schema_json: entry.schema_json.clone(),
                category: rev.category.clone(),
                tags: rev.tags.clone(),
                published_at: Some(rev.created_at.clone()),
                body_html: rev.body_html.clone(),
                body_json: rev.body_json.clone(),
                created_at: rev.created_at.clone(),
                parent_id: entry.parent_id,
                path: entry.path.clone(),
                sort_order: entry.sort_order,
                deleted_at: None,
                author_id: entry.author_id,
            };

            let html = if preview_entry.r#type == "page" {
                let breadcrumbs = db::find_page_ancestors(&db, preview_entry.id).await.unwrap_or_default();
                let children = db::find_published_children(&db, preview_entry.id).await.unwrap_or_default();
                views::render_preview_page(&preview_entry, &origin, &breadcrumbs, &children, &rev)?
            } else {
                views::render_preview_post(&preview_entry, &origin, &rev)?
            };

            let headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            headers.set("Cache-Control", "no-store, no-cache, must-revalidate")?;

            Response::ok(html).map(|res| res.with_headers(headers))
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

#[event(scheduled)]
async fn scheduled(event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    worker::console_log!("Scheduled cron triggered: {}", event.cron());
    if let Err(e) = media::sync_r2_to_d1(&env).await {
        worker::console_error!("Scheduled R2-to-D1 sync error: {e}");
    }
}
