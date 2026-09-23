use worker::*;
use crate::{auth_required, cache, db, error::AppError, media, models, sanitize, utils};
use serde_json::json;

pub async fn get_menus(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let menus = db::menu::get_all_menus(&db).await?;
    Response::from_json(&menus)
}

pub async fn get_menu(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let name = match ctx.param("name") {
        Some(n) => n,
        None => return Response::error("Missing menu name", 400),
    };
    let db = ctx.env.d1("DB")?;
    let menu = db::menu::get_menu_by_name(&db, name).await?;
    match menu {
        Some(m) => Response::from_json(&m),
        None => AppError::NotFound.to_response(),
    }
}

pub async fn put_menu(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    if _user.role != "admin" {
        return AppError::Unauthorized("Only admins can edit menus".into()).to_response();
    }
    let name = match ctx.param("name") {
        Some(n) => n,
        None => return Response::error("Missing menu name", 400),
    };
    
    let payload = match req.json::<models::UpdateMenuRequest>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };
    
    let db = ctx.env.d1("DB")?;
    let success = db::menu::update_menu_items(&db, name, &payload.items_json).await?;
    
    if success {
        cache::purge_urls(&ctx.env, vec![
            format!("{}/", req.url()?.origin().ascii_serialization()),
            format!("{}/sitemap.xml", req.url()?.origin().ascii_serialization()),
            format!("{}/rss.xml", req.url()?.origin().ascii_serialization()),
        ]).await;
        
        Response::from_json(&json!({ "success": true }))
    } else {
        AppError::NotFound.to_response()
    }
}

pub async fn upload_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    media::upload_media(req, &ctx).await
}

pub async fn list_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    media::list_media(&req, &ctx).await
}

pub async fn sync_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    match media::sync_r2_to_d1(&ctx.env).await {
        Ok(report) => Response::from_json(&report),
        Err(err) => Response::error(format!("Media sync failed: {err}"), 500),
    }
}

pub async fn delete_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let key = match ctx.param("key") {
        Some(k) => k,
        None => return Response::error("Missing key", 400),
    };
    media::delete_media(key, &ctx).await
}

pub async fn get_entries(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let filter = url.query_pairs().find(|(k, _)| k == "filter").map(|(_, v)| v.to_string());
    let db = ctx.env.d1("DB")?;
    let entries = if filter.as_deref() == Some("trash") {
        db::find_deleted_entries(&db).await?
    } else {
        db::find_all_entries(&db).await?
    };
    Response::from_json(&entries)
}

pub async fn get_posts(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let entries = db::find_published_posts(&db).await?;
    Response::from_json(&entries)
}

pub async fn create_entry(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);

    let mut payload = match req.json::<models::CreateEntryRequest>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };
    payload.author_id = Some(_user.id);

    if let Err(err) = payload.validate() {
        return err.to_response();
    }

    payload.body_html = sanitize::sanitize_html(&payload.body_html);

    let db = ctx.env.d1("DB")?;

    if let Ok(Some(existing)) = db::find_entry_by_slug(&db, &payload.slug).await {
        if existing.deleted_at.is_some() {
            return AppError::BadRequest(format!(
                "An entry with slug '{}' already exists in the Trash.",
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
        custom_fields_json: payload.custom_fields_json.clone(),
        category: payload.category.clone(),
        tags: payload.tags.clone(),
    };
    let _ = db::create_revision(&db, entry_id, &rev_params, &preview_token).await;

    let origin = req.url()?.origin().ascii_serialization();

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
}

pub async fn update_entry(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);

    let id = ctx.param("id").map(|s| s.as_str()).unwrap_or("");

    let mut payload = match req.json::<models::UpdateEntryRequest>().await {
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
            custom_fields_json: payload.custom_fields_json.or(existing_entry.custom_fields_json),
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
            custom_fields_json: updated_entry.custom_fields_json.clone(),
            category: updated_entry.category.clone(),
            tags: updated_entry.tags.clone(),
        };
        let _ = db::create_revision(&db, num_id, &rev_params, &preview_token).await;
    }

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
}

pub async fn delete_entry(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
}

pub async fn restore_entry(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
}

pub async fn get_revisions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
}

pub async fn get_revision(req: Request, ctx: RouteContext<()>) -> Result<Response> {
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
}

pub async fn search_entries_api(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let query = url.query_pairs().find(|(k, _)| k == "q").map(|(_, v)| v.to_string()).unwrap_or_default();
    
    if query.trim().is_empty() {
        return Response::from_json(&serde_json::json!([]));
    }

    let db = ctx.env.d1("DB")?;
    let results = crate::db::search::search_entries(&db, &query, 5).await?;
    Response::from_json(&results)
}
