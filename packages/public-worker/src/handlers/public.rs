use worker::*;
use crate::{cache, media, utils, views};
use zygo_core::{db, error::AppError, models};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

pub async fn stream_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let key = match ctx.param("key") {
        Some(k) => k,
        None => return Response::error("Missing key", 400),
    };
    media::get_media(key, &req, &ctx).await
}

pub fn options_preflight(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let headers = Headers::new();
    if let Some(origin) = utils::get_allowed_cors_origin(&req, &ctx.env) {
        headers.set("Access-Control-Allow-Origin", &origin)?;
        headers.set("Vary", "Origin")?;
        headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")?;
        headers.set("Access-Control-Allow-Headers", "*")?;
        headers.set("Access-Control-Max-Age", "86400")?;
    }
    Response::empty().map(|res| res.with_headers(headers))
}

pub async fn serve_styles(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let db = ctx.env.d1("DB")?;
    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.unwrap_or_default();

    let mut css = String::new();
    css.push_str(include_str!("../style.css"));
    css.push_str("\n\n/* --- Dynamic Theme Tokens --- */\n");
    css.push_str(&views::generate_theme_root_css(Some(&settings)));

    let headers = Headers::new();
    headers.set("Content-Type", "text/css; charset=utf-8")?;

    if let Some(origin) = utils::get_allowed_cors_origin(&req, &ctx.env) {
        headers.set("Access-Control-Allow-Origin", &origin)?;
        headers.set("Vary", "Origin")?;
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")?;
    }

    css.push_str("\n\n/* --- Layout Templates CSS --- */\n");
    for lt in &layout_templates {
        if !lt.template_css.trim().is_empty() {
            css.push_str(&format!("\n/* Layout: {} ({}) */\n", lt.name, lt.id));
            css.push_str(&lt.template_css);
            css.push('\n');
        }
    }

    let url = req.url()?;
    let path = url.path();
    if cache::is_localhost(&req) {
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate")?;
    } else if path.starts_with("/style-") && path.ends_with(".css") && path != "/style-default.css" {
        headers.set("Cache-Control", "public, max-age=31536000, immutable")?;
    } else {
        headers.set("Cache-Control", "public, max-age=300")?;
    }

    let mut res = Response::ok(css)?.with_headers(headers);
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}


pub async fn posts_index(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let page = utils::parse_page_param(&req);
    let per_page = utils::get_page_size(&ctx.env);
    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;

    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
    let total_posts = db::count_published_posts(&db).await?;
    let pagination = models::Pagination::new("/posts", page, per_page, total_posts);
    let offset = (pagination.page - 1) * per_page;
    let posts = db::find_published_posts_paginated(&db, per_page, offset).await?;
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = views::render_index(
        &section_templates,
        &posts,
        &origin,
        Some(pagination),
        &header_menu,
        &footer_menu,
        Some(&settings),
        layout_templates.as_deref(),
    )?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

    let mut res = Response::ok(html)?.with_headers(headers);
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

#[allow(dead_code)]
pub async fn index(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    posts_index(req, ctx).await
}

pub async fn sitemap(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let entries = db::find_published_entries(&db).await?;
    let mut res = views::render_sitemap(&section_templates, &origin, &entries, &ctx.env, &req)?;
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn rss(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let posts = db::find_published_posts(&db).await?;
    let mut res = views::render_rss(&section_templates, &origin, &posts, &ctx.env, &req)?;
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn post_reader(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
            let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
            let section_templates = zygo_core::db::section_template::get_all(&db).await?;
            let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
            let menus = db::menu::get_all_menus(&db).await?;
            let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
            let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
            let html = views::render_post(
                &section_templates,
                &p,
                &origin,
                &header_menu,
                &footer_menu,
                Some(&settings),
                layout_templates.as_deref(),
            )?;
            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        }
        Err(err) => err.to_response(),
    }
}

pub async fn tag_archive(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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

    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
    let total_posts = db::count_published_posts_by_tag(&db, tag).await?;
    let base_path = format!("/tag/{tag}");
    let pagination = models::Pagination::new(&base_path, page, per_page, total_posts);
    let offset = (pagination.page - 1) * per_page;
    let posts =
        db::find_published_posts_by_tag_paginated(&db, tag, per_page, offset).await?;
        
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = views::render_tag_index(
        &section_templates,
        &posts,
        &origin,
        tag,
        Some(pagination),
        &header_menu,
        &footer_menu,
        Some(&settings),
        layout_templates.as_deref(),
    )?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

    let mut res = Response::ok(html)?.with_headers(headers);
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn category_archive(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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

    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
    let total_posts = db::count_published_posts_by_category(&db, category).await?;
    let base_path = format!("/category/{category}");
    let pagination = models::Pagination::new(&base_path, page, per_page, total_posts);
    let offset = (pagination.page - 1) * per_page;
    let posts =
        db::find_published_posts_by_category_paginated(&db, category, per_page, offset)
            .await?;
            
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = views::render_category_index(
        &section_templates,
        &posts,
        &origin,
        category,
        Some(pagination),
        &header_menu,
        &footer_menu,
        Some(&settings),
        layout_templates.as_deref(),
    )?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

    let mut res = Response::ok(html)?.with_headers(headers);
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn preview(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
        custom_fields_json: rev.custom_fields_json.clone(),
        created_at: rev.created_at.clone(),
        parent_id: entry.parent_id,
        path: entry.path.clone(),
        sort_order: entry.sort_order,
        deleted_at: None,
        author_id: entry.author_id,
        search_text: None,

    };

    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();

    let html = if preview_entry.r#type == "page" {
        let breadcrumbs = db::find_page_ancestors(&db, preview_entry.id).await.unwrap_or_default();
        let children = db::find_published_children(&db, preview_entry.id).await.unwrap_or_default();
        views::render_preview_page(
            &section_templates,
            &preview_entry,
            &origin,
            &breadcrumbs,
            &children,
            &rev,
            &header_menu,
            &footer_menu,
            Some(&settings),
            layout_templates.as_deref(),
        )?
    } else {
        views::render_preview_post(
            &section_templates,
            &preview_entry,
            &origin,
            &rev,
            &header_menu,
            &footer_menu,
            Some(&settings),
            layout_templates.as_deref(),
        )?
    };

    let headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate")?;
    headers.set("Content-Security-Policy", "frame-ancestors *")?;
    let _ = headers.delete("x-frame-options");
    let _ = headers.delete("X-Frame-Options");

    Response::ok(html).map(|res| res.with_headers(headers))
}

pub async fn root_page(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    render_page_or_doc_by_path(&req, &ctx, "/").await
}

pub async fn page_reader(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let path = match ctx.param("path") {
        Some(p) => p,
        None => return Response::error("Missing path", 400),
    };
    render_page_or_doc_by_path(&req, &ctx, path).await
}

async fn render_page_or_doc_by_path(
    req: &Request,
    ctx: &RouteContext<()>,
    path: &str,
) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;

    let page = db::find_published_page_by_path(&db, path).await?;
    if let Some(p) = page {
        let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
        let section_templates = zygo_core::db::section_template::get_all(&db).await?;
        let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
        let breadcrumbs = db::find_page_ancestors(&db, p.id).await.unwrap_or_default();
        let children = db::find_published_children(&db, p.id).await.unwrap_or_default();

        let menus = db::menu::get_all_menus(&db).await?;
        let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
        let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();

        let html = views::render_page(
            &section_templates,
            &p,
            &origin,
            &breadcrumbs,
            &children,
            &header_menu,
            &footer_menu,
            Some(&settings),
            layout_templates.as_deref(),
        )?;
        let mut headers = Headers::new();
        headers.set("Content-Type", "text/html; charset=utf-8")?;
        cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

        let mut res = Response::ok(html)?.with_headers(headers);
        cache::put_cached(&req, &mut res).await;
        return Ok(res);
    }

    let doc = db::find_published_doc_by_path(&db, path).await?;
    if let Some(d) = doc {
        let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
        let section_templates = zygo_core::db::section_template::get_all(&db).await?;
        let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
        let all_docs = db::find_published_docs(&db).await.unwrap_or_default();
        
        let menus = db::menu::get_all_menus(&db).await?;
        let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
        let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();

        let html = views::render_doc(
            &section_templates,
            &d,
            &all_docs,
            &origin,
            &header_menu,
            &footer_menu,
            Some(&settings),
            layout_templates.as_deref(),
        )?;
        let mut headers = Headers::new();
        headers.set("Content-Type", "text/html; charset=utf-8")?;
        cache::add_cache_headers(&mut headers, &ctx.env, &req)?;

        let mut res = Response::ok(html)?.with_headers(headers);
        cache::put_cached(&req, &mut res).await;
        return Ok(res);
    }

    if let Ok(Some(redirect)) = zygo_core::db::redirect::find_by_source_path(&db, path).await {
        let _ = zygo_core::db::redirect::increment_hit_count(&db, redirect.id).await;

        let target_str = if redirect.target_url.starts_with('/') {
            format!("{}{}", origin.trim_end_matches('/'), redirect.target_url)
        } else {
            redirect.target_url.clone()
        };

        let fallback_url = format!("{}/", origin.trim_end_matches('/'));
        let target_url = worker::Url::parse(&target_str)
            .unwrap_or_else(|_| worker::Url::parse(&fallback_url).unwrap());

        let mut res = Response::redirect_with_status(target_url, redirect.status_code as u16)?;
        if redirect.status_code == 301 {
            let _ = res.headers_mut().set("Cache-Control", "public, max-age=86400, s-maxage=86400");
            cache::put_cached(req, &mut res).await;
        } else {
            let _ = res.headers_mut().set("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        return Ok(res);
    }

    AppError::NotFound.to_response()
}


pub async fn search_page(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let query = url.query_pairs().find(|(k, _)| k == "q").map(|(_, v)| v.to_string()).unwrap_or_default();
    let entry_type = url.query_pairs().find(|(k, _)| k == "type").map(|(_, v)| v.to_string());
    let db = ctx.env.d1("DB")?;
    
    let entries = if query.trim().is_empty() {
        vec![]
    } else {
        zygo_core::db::search::search_entries(&db, &query, 50, entry_type.as_deref()).await?
    };

    let settings = zygo_core::db::setting::get_settings_map(&db).await.unwrap_or_default();
    let section_templates = zygo_core::db::section_template::get_all(&db).await?;
    let layout_templates = zygo_core::db::layout_template::get_all(&db).await.ok();
    let menus = zygo_core::db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = crate::views::render_search_html(
        &section_templates,
        &query,
        &entries,
        &header_menu,
        &footer_menu,
        Some(&settings),
        layout_templates.as_deref(),
    )?;
    Response::from_html(html)
}

const MAX_PAYLOAD_BYTES: usize = 65_536; // 64 KB

// Fallback in-memory rate limiter when Cloudflare Cache API is unavailable (e.g. dev / testing)
static FALLBACK_RATE_LIMITER: std::sync::Mutex<Option<std::collections::HashMap<String, (u32, u64)>>> =
    std::sync::Mutex::new(None);

#[cfg(test)]
pub fn reset_fallback_rate_limiter() {
    let mut guard = FALLBACK_RATE_LIMITER.lock().unwrap();
    if let Some(map) = guard.as_mut() {
        map.clear();
    }
}

fn current_time_millis() -> u64 {
    #[cfg(target_arch = "wasm32")]
    {
        worker::Date::now().as_millis()
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0)
    }
}

pub async fn check_and_increment_rate_limit(ip: &str) -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        let cache_url = format!("https://zygo-rate-limit.internal/form-submit/{}", ip);
        let cache = worker::Cache::default();
        match cache.get(&cache_url, false).await {
            Ok(Some(mut res)) => {
                let text = res.text().await.unwrap_or_default();
                let count: u32 = text.trim().parse().unwrap_or(0);
                if count >= 5 {
                    return false;
                } else {
                    let new_count = count + 1;
                    let headers = Headers::new();
                    let _ = headers.set("Cache-Control", "public, max-age=600");
                    if let Ok(mut put_res) = Response::ok(new_count.to_string()) {
                        *put_res.headers_mut() = headers;
                        let _ = cache.put(&cache_url, put_res).await;
                    }
                    return true;
                }
            }
            Ok(None) => {
                let headers = Headers::new();
                let _ = headers.set("Cache-Control", "public, max-age=600");
                if let Ok(mut put_res) = Response::ok("1") {
                    *put_res.headers_mut() = headers;
                    let _ = cache.put(&cache_url, put_res).await;
                }
                return true;
            }
            Err(_) => {
                // Cache API unavailable or errored, fall through to memory fallback
            }
        }
    }

    // Fallback bounded memory structure (local dev / non-wasm tests)
    let now_ms = current_time_millis();
    let mut guard = FALLBACK_RATE_LIMITER.lock().unwrap();
    let map = guard.get_or_insert_with(std::collections::HashMap::new);

    if map.len() > 1000 {
        map.retain(|_, (_, expiry)| *expiry > now_ms);
    }

    if let Some((count, expiry)) = map.get_mut(ip) {
        if *expiry > now_ms {
            if *count >= 5 {
                return false;
            }
            *count += 1;
        } else {
            *count = 1;
            *expiry = now_ms + 600_000;
        }
    } else {
        map.insert(ip.to_string(), (1, now_ms + 600_000));
    }

    true
}

struct Race<F1, F2> {
    f1: F1,
    f2: F2,
}

impl<F1, F2, T> Future for Race<F1, F2>
where
    F1: Future<Output = T> + Unpin,
    F2: Future<Output = T> + Unpin,
{
    type Output = T;

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        if let Poll::Ready(val) = Pin::new(&mut self.f1).poll(cx) {
            return Poll::Ready(val);
        }
        if let Poll::Ready(val) = Pin::new(&mut self.f2).poll(cx) {
            return Poll::Ready(val);
        }
        Poll::Pending
    }
}

async fn verify_turnstile(secret_key: &str, token: &str, ip: &str) -> bool {
    let verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    let body = serde_json::json!({
        "secret": secret_key,
        "response": token,
        "remoteip": ip,
    });

    let headers = Headers::new();
    let _ = headers.set("Content-Type", "application/json");

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body.to_string())));

    let Ok(req) = Request::new_with_init(verify_url, &init) else {
        return false;
    };

    let fetch_fut = Box::pin(async {
        match Fetch::Request(req).send().await {
            Ok(mut res) => {
                if res.status_code() == 200 {
                    if let Ok(data) = res.json::<serde_json::Value>().await {
                        return data.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
                    }
                }
                false
            }
            Err(_) => false,
        }
    });

    let delay_fut = Box::pin(async {
        worker::Delay::from(std::time::Duration::from_secs(5)).await;
        false
    });

    Race { f1: fetch_fut, f2: delay_fut }.await
}

fn json_response(
    data: &serde_json::Value,
    status: u16,
    req: &Request,
    env: &Env,
) -> Result<Response> {
    let mut res = Response::from_json(data)?;
    res = res.with_status(status);
    if let Some(origin) = utils::get_allowed_cors_origin(req, env) {
        let _ = res.headers_mut().set("Access-Control-Allow-Origin", &origin);
        let _ = res.headers_mut().set("Vary", "Origin");
    }
    Ok(res)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedFormPayload {
    pub submission: zygo_core::models::CreateFormSubmission,
    pub honeypot: Option<String>,
    pub turnstile_token: Option<String>,
}

pub fn parse_form_payload(body_text: &str, content_type: &str) -> std::result::Result<ParsedFormPayload, &'static str> {
    let content_type_clean = content_type
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase();

    let mut form_name: Option<String> = None;
    let mut page_path: Option<String> = None;
    let mut sender_name: Option<String> = None;
    let mut sender_email: Option<String> = None;
    let mut subject: Option<String> = None;
    let mut message: Option<String> = None;
    let mut metadata_map = serde_json::Map::new();
    let mut honeypot_val: Option<String> = None;
    let mut turnstile_token: Option<String> = None;

    if content_type_clean == "application/json" {
        let json_val: serde_json::Value = match serde_json::from_str(body_text) {
            Ok(v) => v,
            Err(_) => return Err("Malformed JSON payload"),
        };

        let obj = match json_val.as_object() {
            Some(o) => o,
            None => return Err("JSON payload must be an object"),
        };

        for (k, v) in obj {
            match k.as_str() {
                "form_name" => form_name = v.as_str().map(|s| s.to_string()),
                "page_path" => page_path = v.as_str().map(|s| s.to_string()),
                "sender_name" | "name" => sender_name = v.as_str().map(|s| s.to_string()),
                "sender_email" | "email" => sender_email = v.as_str().map(|s| s.to_string()),
                "subject" => subject = v.as_str().map(|s| s.to_string()),
                "message" => message = v.as_str().map(|s| s.to_string()),
                "website" | "honeypot" | "_gotcha" => {
                    if let Some(s) = v.as_str() {
                        if !s.trim().is_empty() {
                            honeypot_val = Some(s.to_string());
                        }
                    }
                }
                "cf-turnstile-response" | "turnstile_token" | "cf_turnstile_response" => {
                    turnstile_token = v.as_str().map(|s| s.to_string());
                }
                "metadata" | "metadata_json" => {
                    if let Some(meta_obj) = v.as_object() {
                        for (mk, mv) in meta_obj {
                            metadata_map.insert(mk.clone(), mv.clone());
                        }
                    } else if let Some(meta_str) = v.as_str() {
                        if let Ok(serde_json::Value::Object(m)) = serde_json::from_str(meta_str) {
                            for (mk, mv) in m {
                                metadata_map.insert(mk, mv);
                            }
                        }
                    }
                }
                other => {
                    metadata_map.insert(other.to_string(), v.clone());
                }
            }
        }
    } else if content_type_clean == "application/x-www-form-urlencoded" {
        let dummy_url_str = format!("https://dummy.local/?{}", body_text);
        let dummy_url = match worker::Url::parse(&dummy_url_str) {
            Ok(u) => u,
            Err(_) => return Err("Malformed form payload"),
        };

        for (k, v) in dummy_url.query_pairs() {
            let key = k.as_ref();
            let val = v.as_ref();
            match key {
                "form_name" => form_name = Some(val.to_string()),
                "page_path" => page_path = Some(val.to_string()),
                "sender_name" | "name" => sender_name = Some(val.to_string()),
                "sender_email" | "email" => sender_email = Some(val.to_string()),
                "subject" => subject = Some(val.to_string()),
                "message" => message = Some(val.to_string()),
                "website" | "honeypot" | "_gotcha" => {
                    if !val.trim().is_empty() {
                        honeypot_val = Some(val.to_string());
                    }
                }
                "cf-turnstile-response" | "turnstile_token" | "cf_turnstile_response" => {
                    turnstile_token = Some(val.to_string());
                }
                "metadata_json" => {
                    if let Ok(serde_json::Value::Object(m)) = serde_json::from_str(val) {
                        for (mk, mv) in m {
                            metadata_map.insert(mk, mv);
                        }
                    }
                }
                other => {
                    metadata_map.insert(
                        other.to_string(),
                        serde_json::Value::String(val.to_string()),
                    );
                }
            }
        }
    } else {
        return Err("Unsupported content type. Expected application/json or application/x-www-form-urlencoded");
    }

    let metadata_json_str = if metadata_map.is_empty() {
        None
    } else {
        Some(serde_json::Value::Object(metadata_map).to_string())
    };

    let submission = zygo_core::models::CreateFormSubmission {
        form_name: form_name.filter(|s| !s.trim().is_empty()),
        page_path: page_path.filter(|s| !s.trim().is_empty()),
        sender_name: sender_name.filter(|s| !s.trim().is_empty()),
        sender_email: sender_email.unwrap_or_default(),
        subject: subject.filter(|s| !s.trim().is_empty()),
        message: message.filter(|s| !s.trim().is_empty()),
        metadata_json: metadata_json_str,
    };

    Ok(ParsedFormPayload {
        submission,
        honeypot: honeypot_val,
        turnstile_token,
    })
}

pub async fn submit_form(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    // 1. 64 KB Content-Length enforcement
    let _content_length: usize = match req.headers().get("content-length").ok().flatten() {
        Some(cl_str) => match cl_str.trim().parse::<usize>() {
            Ok(len) if len <= MAX_PAYLOAD_BYTES => len,
            _ => {
                return json_response(
                    &serde_json::json!({ "error": "Payload too large" }),
                    413,
                    &req,
                    &ctx.env,
                );
            }
        },
        None => {
            return json_response(
                &serde_json::json!({ "error": "Payload too large" }),
                413,
                &req,
                &ctx.env,
            );
        }
    };

    // 2. Read body bytes and enforce maximum size
    let body_text = match req.text().await {
        Ok(t) => t,
        Err(_) => {
            return json_response(
                &serde_json::json!({ "error": "Malformed payload" }),
                400,
                &req,
                &ctx.env,
            );
        }
    };

    if body_text.len() > MAX_PAYLOAD_BYTES {
        return json_response(
            &serde_json::json!({ "error": "Payload too large" }),
            413,
            &req,
            &ctx.env,
        );
    }

    // Zero-Write Pre-D1 Gating:
    // 1. IP Submission Rate Limiting: Max 5 submissions per 10 minutes per IP
    let ip = req
        .headers()
        .get("cf-connecting-ip")
        .ok()
        .flatten()
        .unwrap_or_else(|| "127.0.0.1".to_string());

    if !check_and_increment_rate_limit(&ip).await {
        return json_response(
            &serde_json::json!({ "error": "Too many submissions. Please try again later." }),
            429,
            &req,
            &ctx.env,
        );
    }

    // 2. Content-Type handling & Parsing
    let content_type = req
        .headers()
        .get("content-type")
        .ok()
        .flatten()
        .unwrap_or_default();

    let parsed = match parse_form_payload(&body_text, &content_type) {
        Ok(p) => p,
        Err(err_msg) => {
            return json_response(
                &serde_json::json!({ "error": err_msg }),
                400,
                &req,
                &ctx.env,
            );
        }
    };

    // 3. Honeypot check: inspect decoy field website/honeypot.
    // If present and non-empty, silently return 200 OK without touching D1.
    if parsed.honeypot.is_some() {
        return json_response(
            &serde_json::json!({ "success": true, "message": "Thank you for your submission." }),
            200,
            &req,
            &ctx.env,
        );
    }

    // 4. Turnstile Verification (opt-in if TURNSTILE_SECRET_KEY secret/env var is configured)
    let turnstile_secret = ctx
        .env
        .var("TURNSTILE_SECRET_KEY")
        .or_else(|_| ctx.env.secret("TURNSTILE_SECRET_KEY"))
        .ok()
        .map(|v| v.to_string().trim().to_string())
        .filter(|s| !s.is_empty());

    if let Some(secret_key) = turnstile_secret {
        let token = parsed.turnstile_token.filter(|t| !t.trim().is_empty());
        let Some(token) = token else {
            return json_response(
                &serde_json::json!({ "error": "Verification failed" }),
                400,
                &req,
                &ctx.env,
            );
        };

        if !verify_turnstile(&secret_key, &token, &ip).await {
            return json_response(
                &serde_json::json!({ "error": "Verification failed" }),
                400,
                &req,
                &ctx.env,
            );
        }
    }

    // 5. Field validation using zygo-core::models::CreateFormSubmission
    if let Err(err) = parsed.submission.validate() {
        let err_msg = match &err {
            AppError::BadRequest(m) => m.as_str(),
            _ => "Validation error",
        };
        return json_response(
            &serde_json::json!({ "error": err_msg }),
            400,
            &req,
            &ctx.env,
        );
    }

    // Phase 2: D1 Write
    let db = match ctx.env.d1("DB") {
        Ok(db) => db,
        Err(e) => {
            worker::console_error!("submit_form: D1 connection error: {e}");
            return json_response(
                &serde_json::json!({ "error": "Database error" }),
                500,
                &req,
                &ctx.env,
            );
        }
    };

    match zygo_core::db::form_submission::create(&db, &parsed.submission).await {
        Ok(_) => json_response(
            &serde_json::json!({
                "success": true,
                "message": "Thank you for your submission."
            }),
            200,
            &req,
            &ctx.env,
        ),
        Err(e) => {
            worker::console_error!("submit_form: D1 insertion error: {e}");
            json_response(
                &serde_json::json!({ "error": "Failed to save submission" }),
                500,
                &req,
                &ctx.env,
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn block_on<F: Future>(f: F) -> F::Output {
        let waker = std::task::Waker::noop();
        let mut cx = Context::from_waker(&waker);
        let mut pin = std::pin::pin!(f);
        match pin.as_mut().poll(&mut cx) {
            Poll::Ready(res) => res,
            Poll::Pending => panic!("Future did not complete immediately"),
        }
    }

    #[test]
    fn test_rate_limit_counter_allows_five_and_blocks_sixth() {
        reset_fallback_rate_limiter();
        let ip = "192.0.2.1";

        // First 5 submissions allowed
        for i in 1..=5 {
            let allowed = block_on(check_and_increment_rate_limit(ip));
            assert!(allowed, "Submission {} should be allowed", i);
        }

        // 6th submission blocked
        let allowed = block_on(check_and_increment_rate_limit(ip));
        assert!(!allowed, "6th submission must be blocked by rate limiter");

        // Different IP should still be allowed
        let other_ip = "192.0.2.2";
        let allowed = block_on(check_and_increment_rate_limit(other_ip));
        assert!(allowed, "Different IP should be allowed");
    }

    #[test]
    fn test_parse_form_payload_json_valid() {
        let json = r#"{
            "form_name": "contact",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "subject": "Inquiry",
            "message": "Hello from testing",
            "phone": "+1-555-123-4567"
        }"#;

        let parsed = parse_form_payload(json, "application/json").expect("should parse JSON");
        assert_eq!(parsed.submission.form_name.as_deref(), Some("contact"));
        assert_eq!(parsed.submission.sender_name.as_deref(), Some("Jane Doe"));
        assert_eq!(parsed.submission.sender_email, "jane@example.com");
        assert_eq!(parsed.submission.subject.as_deref(), Some("Inquiry"));
        assert_eq!(parsed.submission.message.as_deref(), Some("Hello from testing"));
        assert!(parsed.honeypot.is_none());
        assert!(parsed.turnstile_token.is_none());

        // Check extra field phone in metadata_json
        let meta: serde_json::Value = serde_json::from_str(parsed.submission.metadata_json.as_deref().unwrap()).unwrap();
        assert_eq!(meta.get("phone").and_then(|v| v.as_str()), Some("+1-555-123-4567"));

        // Validation should succeed
        assert!(parsed.submission.validate().is_ok());
    }

    #[test]
    fn test_parse_form_payload_urlencoded_valid() {
        let body = "form_name=newsletter&sender_email=reader%40example.com&website=";
        let parsed = parse_form_payload(body, "application/x-www-form-urlencoded").expect("should parse form");
        assert_eq!(parsed.submission.form_name.as_deref(), Some("newsletter"));
        assert_eq!(parsed.submission.sender_email, "reader@example.com");
        assert!(parsed.honeypot.is_none()); // empty website is not a honeypot trigger

        assert!(parsed.submission.validate().is_ok());
    }

    #[test]
    fn test_parse_form_payload_honeypot_detection() {
        // JSON decoy
        let json_hp = r#"{"email": "bot@spam.com", "website": "http://spamsite.org"}"#;
        let parsed_json = parse_form_payload(json_hp, "application/json").unwrap();
        assert_eq!(parsed_json.honeypot.as_deref(), Some("http://spamsite.org"));

        // URL-encoded decoy
        let url_hp = "email=bot%40spam.com&_gotcha=http%3A%2F%2Fspamsite.org";
        let parsed_url = parse_form_payload(url_hp, "application/x-www-form-urlencoded").unwrap();
        assert_eq!(parsed_url.honeypot.as_deref(), Some("http://spamsite.org"));
    }

    #[test]
    fn test_parse_form_payload_turnstile_detection() {
        let json = r#"{"email": "valid@example.com", "cf-turnstile-response": "token-12345"}"#;
        let parsed = parse_form_payload(json, "application/json").unwrap();
        assert_eq!(parsed.turnstile_token.as_deref(), Some("token-12345"));

        let url = "email=valid%40example.com&turnstile_token=token-67890";
        let parsed_url = parse_form_payload(url, "application/x-www-form-urlencoded").unwrap();
        assert_eq!(parsed_url.turnstile_token.as_deref(), Some("token-67890"));
    }

    #[test]
    fn test_parse_form_payload_unsupported_content_type() {
        let res = parse_form_payload("raw text", "text/plain");
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Unsupported content type"));
    }

    #[test]
    fn test_parse_form_payload_malformed_json() {
        let res = parse_form_payload("{not a valid json", "application/json");
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Malformed JSON payload");
    }

    #[test]
    fn test_submission_validation_rules() {
        // Missing email
        let empty_email = zygo_core::models::CreateFormSubmission {
            sender_email: "".to_string(),
            ..Default::default()
        };
        assert!(empty_email.validate().is_err());

        // Invalid email format
        let invalid_email = zygo_core::models::CreateFormSubmission {
            sender_email: "not-an-email".to_string(),
            ..Default::default()
        };
        assert!(invalid_email.validate().is_err());

        // Email with newline (header injection attempt)
        let injection_email = zygo_core::models::CreateFormSubmission {
            sender_email: "test@example.com\nBcc: victim@example.com".to_string(),
            ..Default::default()
        };
        assert!(injection_email.validate().is_err());

        // Oversized message (> 5000 chars)
        let long_msg = "a".repeat(5001);
        let oversized = zygo_core::models::CreateFormSubmission {
            sender_email: "valid@example.com".to_string(),
            message: Some(long_msg),
            ..Default::default()
        };
        assert!(oversized.validate().is_err());
    }
}
