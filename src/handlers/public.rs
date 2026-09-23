use worker::*;
use crate::{cache, db, error::AppError, media, models, utils, views};

pub async fn stream_media(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let key = match ctx.param("key") {
        Some(k) => k,
        None => return Response::error("Missing key", 400),
    };
    media::get_media(key, &ctx).await
}

pub async fn index(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
    
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = views::render_index(&posts, &origin, Some(pagination), &header_menu, &footer_menu)?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env)?;

    let mut res = Response::ok(html)?.with_headers(headers);
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn sitemap(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;
    let entries = db::find_published_entries(&db).await?;
    let mut res = views::render_sitemap(&origin, &entries, &ctx.env)?;
    cache::put_cached(&req, &mut res).await;
    Ok(res)
}

pub async fn rss(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;
    let posts = db::find_published_posts(&db).await?;
    let mut res = views::render_rss(&origin, &posts, &ctx.env)?;
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
            let menus = db::menu::get_all_menus(&db).await?;
            let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
            let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
            let html = views::render_post(&p, &origin, &header_menu, &footer_menu)?;
            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

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

    let total_posts = db::count_published_posts_by_tag(&db, tag).await?;
    let base_path = format!("/tag/{tag}");
    let pagination = models::Pagination::new(&base_path, page, per_page, total_posts);
    let offset = (pagination.page - 1) * per_page;
    let posts =
        db::find_published_posts_by_tag_paginated(&db, tag, per_page, offset).await?;
        
    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();
    
    let html = views::render_tag_index(&posts, &origin, tag, Some(pagination), &header_menu, &footer_menu)?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env)?;

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
    
    let html = views::render_category_index(&posts, &origin, category, Some(pagination), &header_menu, &footer_menu)?;

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    cache::add_cache_headers(&mut headers, &ctx.env)?;

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
        created_at: rev.created_at.clone(),
        parent_id: entry.parent_id,
        path: entry.path.clone(),
        sort_order: entry.sort_order,
        deleted_at: None,
        author_id: entry.author_id,
    };

    let menus = db::menu::get_all_menus(&db).await?;
    let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
    let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();

    let html = if preview_entry.r#type == "page" {
        let breadcrumbs = db::find_page_ancestors(&db, preview_entry.id).await.unwrap_or_default();
        let children = db::find_published_children(&db, preview_entry.id).await.unwrap_or_default();
        views::render_preview_page(&preview_entry, &origin, &breadcrumbs, &children, &rev, &header_menu, &footer_menu)?
    } else {
        views::render_preview_post(&preview_entry, &origin, &rev, &header_menu, &footer_menu)?
    };

    let mut headers = Headers::new();
    headers.set("Content-Type", "text/html; charset=utf-8")?;
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate")?;

    Response::ok(html).map(|res| res.with_headers(headers))
}

pub async fn page_reader(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(cached) = cache::get_cached(&req).await {
        return Ok(cached);
    }

    let path = match ctx.param("path") {
        Some(p) => p,
        None => return Response::error("Missing path", 400),
    };

    let origin = utils::get_canonical_origin(&req, &ctx.env);
    let db = ctx.env.d1("DB")?;

    let page = db::find_published_page_by_path(&db, path)
        .await?
        .ok_or(AppError::NotFound);

    match page {
        Ok(p) => {
            let breadcrumbs = db::find_page_ancestors(&db, p.id).await.unwrap_or_default();
            let children = db::find_published_children(&db, p.id).await.unwrap_or_default();

            let menus = db::menu::get_all_menus(&db).await?;
            let header_menu = menus.get("header").map(|m| m.parsed_items()).unwrap_or_default();
            let footer_menu = menus.get("footer").map(|m| m.parsed_items()).unwrap_or_default();

            let html = views::render_page(&p, &origin, &breadcrumbs, &children, &header_menu, &footer_menu)?;
            let mut headers = Headers::new();
            headers.set("Content-Type", "text/html; charset=utf-8")?;
            cache::add_cache_headers(&mut headers, &ctx.env)?;

            let mut res = Response::ok(html)?.with_headers(headers);
            cache::put_cached(&req, &mut res).await;
            Ok(res)
        }
        Err(err) => err.to_response(),
    }
}
