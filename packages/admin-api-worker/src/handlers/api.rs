use worker::*;
use crate::{auth_required, cache, media, sanitize, utils};
use zygo_core::{db, error::AppError, models};
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
        let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
        let mut purge_list = Vec::new();
        add_purge_target(&mut purge_list, &origin, "/");
        add_purge_target(&mut purge_list, &origin, "/post");
        add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
        add_purge_target(&mut purge_list, &origin, "/rss.xml");
        add_purge_target(&mut purge_list, &origin, "/feed.xml");
        add_purge_target(&mut purge_list, &origin, "/search");

        if let Ok(entries) = db::find_all_entries(&db).await {
            for entry in entries {
                if entry.status == "published" {
                    add_purge_target(&mut purge_list, &origin, &entry.path());
                }
            }
        }

        if let Ok(req_url) = req.url() {
            let req_origin = req_url.origin().ascii_serialization();
            if req_origin != origin {
                add_purge_target(&mut purge_list, &req_origin, "/");
                add_purge_target(&mut purge_list, &req_origin, "/post");
                add_purge_target(&mut purge_list, &req_origin, "/sitemap.xml");
                add_purge_target(&mut purge_list, &req_origin, "/rss.xml");
            }
        }

        cache::purge_urls(&ctx.env, purge_list).await;
        
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

pub async fn stream_media(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let key = match ctx.param("key") {
        Some(k) => k,
        None => return Response::error("Missing key", 400),
    };
    media::get_media(key, &req, &ctx).await
}

pub async fn get_entries(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
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

pub const AUTHOR_RESTRICTED_STATUSES: &[&str] = &["published", "ready_for_publish", "archived", "scheduled"];

pub fn validate_author_entry_creation(role: &str, status: Option<&str>) -> std::result::Result<(), &'static str> {
    if role == "author" {
        if let Some(st) = status {
            if AUTHOR_RESTRICTED_STATUSES.contains(&st) {
                return Err("Authors cannot create entries directly in published, ready for publish, or archived status. Please submit for review.");
            }
        }
    }
    Ok(())
}

pub fn validate_author_entry_update(role: &str, status: Option<&str>) -> std::result::Result<(), &'static str> {
    if role == "author" {
        if let Some(st) = status {
            if AUTHOR_RESTRICTED_STATUSES.contains(&st) {
                return Err("Authors cannot publish or archive entries directly. Please submit for review.");
            }
        }
    }
    Ok(())
}

pub fn validate_author_bulk_action(role: &str, action: models::BulkActionType) -> std::result::Result<(), &'static str> {
    if role == "author" && action == models::BulkActionType::Publish {
        return Err("Authors cannot publish or archive entries directly. Please submit for review.");
    }
    Ok(())
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

    if let Err(msg) = validate_author_entry_creation(&_user.role, payload.status.as_deref()) {
        return Response::error(msg, 403);
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

    let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;

    let mut purge_list = Vec::new();
    add_purge_target(&mut purge_list, &origin, "/");
    add_purge_target(&mut purge_list, &origin, "/post");
    add_purge_target(&mut purge_list, &origin, &entry_path);
    add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
    add_purge_target(&mut purge_list, &origin, "/rss.xml");
    add_purge_target(&mut purge_list, &origin, "/feed.xml");
    if let Some(ref cat) = payload.category {
        let trimmed = cat.trim();
        if !trimmed.is_empty() {
            add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
        }
    }
    if let Some(ref tags) = payload.tags {
        for tag in tags.split(',') {
            let trimmed = tag.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
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
    
    let db = ctx.env.d1("DB")?;

    let existing_entry = db::find_entry_by_id(&db, id).await?;
    if let Some(ref e) = existing_entry {
        let is_root_home_page = e.r#type == "page" && e.path() == "/";
        if is_root_home_page {
            payload.r#type = Some("page".to_string());
            payload.parent_id = Some(None);
            payload.sort_order = Some(0);
        }

        if e.r#type == "doc" {
            let actual_path = if let Ok(Some(s)) = db::setting::get_setting(&db, "docs_path").await {
                if s.value.is_empty() { "/docs".to_string() } else { s.value }
            } else {
                "/docs".to_string()
            };
            let docs_slug = actual_path.trim_start_matches('/');
            let docs_slug = if docs_slug.is_empty() { "docs" } else { docs_slug };
            
            if e.slug == docs_slug {
                // Ignore any attempts to change parent_id or sort_order for Docs Home
                payload.parent_id = Some(None); 
                payload.sort_order = Some(0);
            }
        }
    }

    if let Some(ref mut html) = payload.body_html {
        *html = sanitize::sanitize_html(html);
    }

    let is_draft_only = payload.draft_only.unwrap_or(false);
    let num_id = match id.parse::<i64>() {
        Ok(n) => n,
        Err(_) => return Response::error("Invalid entry id", 400),
    };

    if is_draft_only {
        let existing_entry = match existing_entry {
            Some(e) => e,
            None => return AppError::NotFound.to_response(),
        };

        if _user.role == "author" {
            if existing_entry.author_id != Some(_user.id) {
                return AppError::Unauthorized("You do not have permission to edit this entry".into()).to_response();
            }
            if let Err(msg) = validate_author_entry_update(&_user.role, payload.status.as_deref()) {
                return Response::error(msg, 403);
            }
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
        if _user.role == "author" {
            if e.author_id != Some(_user.id) {
                return AppError::Unauthorized("You do not have permission to edit this entry".into()).to_response();
            }
            if let Err(msg) = validate_author_entry_update(&_user.role, payload.status.as_deref()) {
                return Response::error(msg, 403);
            }
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

    let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
    let mut purge_list = Vec::new();
    add_purge_target(&mut purge_list, &origin, "/");
    add_purge_target(&mut purge_list, &origin, "/post");
    add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
    add_purge_target(&mut purge_list, &origin, "/rss.xml");
    add_purge_target(&mut purge_list, &origin, "/feed.xml");
    if let Some(ref entry) = existing_entry {
        add_purge_target(&mut purge_list, &origin, &entry.path());
        let old_prefix = format!("{}/", entry.path());
        let all_entries = db::find_all_entries(&db).await.unwrap_or_default();
        for e in all_entries {
            if e.path().starts_with(&old_prefix) {
                add_purge_target(&mut purge_list, &origin, &e.path());
            }
        }
        if let Some(ref cat) = entry.category {
            let trimmed = cat.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
            }
        }
        for tag in entry.tag_list() {
            let trimmed = tag.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
            }
        }
    }
    if let Some(updated_entry) = db::find_entry_by_id(&db, id).await? {
        add_purge_target(&mut purge_list, &origin, &updated_entry.path());
    }
    if let Some(ref cat) = payload.category {
        let trimmed = cat.trim();
        if !trimmed.is_empty() {
            add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
        }
    }
    if let Some(ref tags) = payload.tags {
        for tag in tags.split(',') {
            let trimmed = tag.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
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

        if e.r#type == "page" && e.path() == "/" {
            return AppError::BadRequest("The Home page cannot be deleted.".into()).to_response();
        }
        
        if e.r#type == "doc" {
            let actual_path = if let Ok(Some(s)) = db::setting::get_setting(&db, "docs_path").await {
                if s.value.is_empty() { "/docs".to_string() } else { s.value }
            } else {
                "/docs".to_string()
            };
            let docs_slug = actual_path.trim_start_matches('/');
            let docs_slug = if docs_slug.is_empty() { "docs" } else { docs_slug };
            
            if e.slug == docs_slug {
                return AppError::BadRequest("The Docs Home page cannot be deleted.".into()).to_response();
            }
        }
    }
    let delete_result = db::delete_entry(&db, id).await;

    let _deleted = match delete_result {
        Ok(true) => true,
        Ok(false) => return AppError::NotFound.to_response(),
        Err(e) => return Response::error(e.to_string(), 400),
    };

    let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
    let mut purge_list = Vec::new();
    add_purge_target(&mut purge_list, &origin, "/");
    add_purge_target(&mut purge_list, &origin, "/post");
    add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
    add_purge_target(&mut purge_list, &origin, "/rss.xml");
    add_purge_target(&mut purge_list, &origin, "/feed.xml");
    if let Some(ref entry) = existing_entry {
        add_purge_target(&mut purge_list, &origin, &entry.path());
        if let Some(ref cat) = entry.category {
            let trimmed = cat.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
            }
        }
        for tag in entry.tag_list() {
            let trimmed = tag.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
            }
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
            let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
            let mut purge_list = Vec::new();
            add_purge_target(&mut purge_list, &origin, "/");
            add_purge_target(&mut purge_list, &origin, "/post");
            add_purge_target(&mut purge_list, &origin, &entry.path());
            add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
            add_purge_target(&mut purge_list, &origin, "/rss.xml");
            add_purge_target(&mut purge_list, &origin, "/feed.xml");
            if let Some(ref cat) = entry.category {
                let trimmed = cat.trim();
                if !trimmed.is_empty() {
                    add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
                }
            }
            for tag in entry.tag_list() {
                let trimmed = tag.trim();
                if !trimmed.is_empty() {
                    add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
                }
            }
            cache::purge_urls(&ctx.env, purge_list).await;
        }
    }

    Response::from_json(&json!({ "success": true, "restored": id }))
}

pub async fn bulk_entries(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);

    let payload = match req.json::<models::BulkEntriesRequest>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    if let Err(err) = payload.validate() {
        return err.to_response();
    }

    if let Err(msg) = validate_author_bulk_action(&_user.role, payload.action) {
        return Response::error(msg, 403);
    }

    let db = ctx.env.d1("DB")?;

    let target_entries = db::find_entries_by_ids(&db, &payload.ids).await?;
    if target_entries.is_empty() {
        return Response::from_json(&models::BulkEntriesResponse {
            success: false,
            affected: 0,
            skipped: payload.ids.len(),
            errors: vec!["No matching entries found".to_string()],
        });
    }

    let (authorized_ids, mut errors) = if _user.role == "author" {
        let mut auth_ids = Vec::new();
        let mut errs = Vec::new();
        for entry in &target_entries {
            if entry.author_id == Some(_user.id) {
                auth_ids.push(entry.id);
            } else {
                errs.push(format!("You do not have permission to modify '{}'.", entry.title));
            }
        }
        (auth_ids, errs)
    } else {
        (payload.ids.clone(), Vec::new())
    };

    let skipped_init = payload.ids.len().saturating_sub(authorized_ids.len());

    let (affected, skipped, mut op_errors) = match payload.action {
        models::BulkActionType::Publish => {
            let aff = db::bulk_update_status(&db, &authorized_ids, "published").await?;
            (aff, skipped_init, Vec::new())
        }
        models::BulkActionType::Unpublish => {
            let aff = db::bulk_update_status(&db, &authorized_ids, "draft").await?;
            (aff, skipped_init, Vec::new())
        }
        models::BulkActionType::Trash => {
            let (aff, skp, errs) = db::bulk_delete_entries(&db, &authorized_ids, &_user.role, _user.id).await?;
            (aff, skp + skipped_init, errs)
        }
        models::BulkActionType::AddTags => {
            let tags = payload.tags.as_deref().unwrap_or("");
            let aff = db::bulk_modify_tags(&db, &authorized_ids, tags, true).await?;
            (aff, skipped_init, Vec::new())
        }
        models::BulkActionType::RemoveTags => {
            let tags = payload.tags.as_deref().unwrap_or("");
            let aff = db::bulk_modify_tags(&db, &authorized_ids, tags, false).await?;
            (aff, skipped_init, Vec::new())
        }
    };

    errors.append(&mut op_errors);

    let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
    let mut purge_list = Vec::new();
    add_purge_target(&mut purge_list, &origin, "/");
    add_purge_target(&mut purge_list, &origin, "/post");
    add_purge_target(&mut purge_list, &origin, "/sitemap.xml");
    add_purge_target(&mut purge_list, &origin, "/rss.xml");
    add_purge_target(&mut purge_list, &origin, "/feed.xml");

    for entry in &target_entries {
        if authorized_ids.contains(&entry.id) {
            add_purge_target(&mut purge_list, &origin, &entry.path());
            let old_prefix = format!("{}/", entry.path());
            if entry.r#type == "page" {
                if let Ok(all_entries) = db::find_all_entries(&db).await {
                    for e in all_entries {
                        if e.path().starts_with(&old_prefix) {
                            add_purge_target(&mut purge_list, &origin, &e.path());
                        }
                    }
                }
            }
            if let Some(ref cat) = entry.category {
                let trimmed = cat.trim();
                if !trimmed.is_empty() {
                    add_purge_target(&mut purge_list, &origin, &format!("/category/{}", trimmed));
                }
            }
            for tag in entry.tag_list() {
                let trimmed = tag.trim();
                if !trimmed.is_empty() {
                    add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
                }
            }
        }
    }

    if let Some(ref tags) = payload.tags {
        for tag in tags.split(',') {
            let trimmed = tag.trim();
            if !trimmed.is_empty() {
                add_purge_target(&mut purge_list, &origin, &format!("/tag/{}", trimmed));
            }
        }
    }

    cache::purge_urls(&ctx.env, purge_list).await;

    Response::from_json(&models::BulkEntriesResponse {
        success: affected > 0 || (errors.is_empty() && skipped == 0),
        affected,
        skipped,
        errors,
    })
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
    let entry_type = url.query_pairs().find(|(k, _)| k == "type").map(|(_, v)| v.to_string());
    
    if query.trim().is_empty() {
        return Response::from_json(&serde_json::json!([]));
    }

    let db = ctx.env.d1("DB")?;
    let results = zygo_core::db::search::search_entries(&db, &query, 5, entry_type.as_deref()).await?;
    Response::from_json(&results)
}

fn get_fallback_origin(req: &Request, env: &Env) -> Result<String> {
    let req_url = req.url()?;
    let host = req_url.host_str().unwrap_or("");
    let root_domain = host.strip_prefix("api.").unwrap_or(host);
    let public_sub = env.var("PUBLIC_SUBDOMAIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "www".to_string());
    let origin = if public_sub.trim().is_empty() {
        format!("https://{}", root_domain)
    } else {
        format!("https://{}.{}", public_sub.trim(), root_domain)
    };
    Ok(origin)
}

pub async fn resolve_canonical_origin(req: &Request, env: &Env, db: &worker::D1Database) -> Result<String> {
    if let Ok(Some(setting)) = db::setting::get_setting(db, "canonical_origin").await {
        if !setting.value.trim().is_empty() {
            return Ok(setting.value.trim().trim_end_matches('/').to_string());
        }
    }
    if let Ok(env_origin) = env.var("CANONICAL_ORIGIN").or_else(|_| env.var("SITE_URL")) {
        let s = env_origin.to_string();
        if !s.trim().is_empty() {
            return Ok(s.trim().trim_end_matches('/').to_string());
        }
    }
    get_fallback_origin(req, env)
}

fn add_purge_target(purge_list: &mut Vec<String>, origin: &str, path: &str) {
    let clean_path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };
    let full_url = format!("{}{}", origin, clean_path);
    if !purge_list.contains(&full_url) {
        purge_list.push(full_url);
    }
    if !purge_list.contains(&clean_path) {
        purge_list.push(clean_path);
    }
}

#[derive(serde::Deserialize)]
struct UpdateSettingsReq {
    #[serde(default)]
    settings: Option<std::collections::HashMap<String, String>>,
    #[serde(default)]
    key: Option<String>,
    #[serde(default)]
    value: Option<String>,
}

pub async fn update_setting(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let payload: UpdateSettingsReq = match req.json().await {
        Ok(p) => p,
        Err(_) => return Response::error("Invalid JSON", 400),
    };

    let mut to_update = std::collections::HashMap::new();
    if let Some(s) = payload.settings {
        to_update.extend(s);
    }
    if let (Some(k), Some(v)) = (payload.key, payload.value) {
        to_update.insert(k, v);
    }
    if to_update.is_empty() {
        return Response::error("No settings provided", 400);
    }

    // Protect against accidentally overwriting the Turnstile secret with the masked placeholder
    if let Some(secret) = to_update.get("turnstile_secret_key") {
        let s = secret.trim();
        if s == "••••••••" || s == "********" || (!s.is_empty() && s.chars().all(|c| c == '•' || c == '*')) {
            to_update.remove("turnstile_secret_key");
        }
    }
    if to_update.is_empty() {
        return Response::from_json(&serde_json::json!({ "success": true }));
    }

    let db = ctx.env.d1("DB")?;
    for (k, v) in &to_update {
        db::setting::set_setting(&db, k, v).await?;
    }

    if let Some(enabled) = to_update.get("docs_mode_enabled") {
        if enabled == "true" {
            // Need to get actual docs_path from db if not in to_update
            let actual_path = if let Some(p) = to_update.get("docs_path") {
                p.clone()
            } else {
                if let Ok(Some(s)) = db::setting::get_setting(&db, "docs_path").await {
                    if s.value.is_empty() { "/docs".to_string() } else { s.value }
                } else {
                    "/docs".to_string()
                }
            };
            
            let slug = actual_path.trim_start_matches('/');
            let slug = if slug.is_empty() { "docs".to_string() } else { slug.to_string() };

            if let Ok(None) = db::find_entry_by_slug(&db, &slug).await {
                // Create Docs Home
                let req = models::CreateEntryRequest {
                    slug: slug.clone(),
                    title: "Docs Home".to_string(),
                    r#type: Some("doc".to_string()),
                    status: Some("published".to_string()),
                    description: Some("Welcome to the documentation.".to_string()),
                    cover_image: None,
                    canonical_url: None,
                    schema_json: None,
                    category: None,
                    tags: None,
                    parent_id: None,
                    sort_order: Some(0),
                    body_html: "<p>Welcome to the docs.</p>".to_string(),
                    body_json: "{}".to_string(),
                    custom_fields_json: None,
                    published_at: None,
                    author_id: Some(user.id),
                };
                let _ = db::create_entry(&db, &req).await;
            }
        }
    }

    let origin = if let Some(origin_val) = to_update.get("canonical_origin").filter(|s| !s.trim().is_empty()) {
        origin_val.trim().trim_end_matches('/').to_string()
    } else {
        resolve_canonical_origin(&req, &ctx.env, &db).await?
    };

    let all_settings = db::setting::get_settings_map(&db).await.unwrap_or_default();
    let old_hash = all_settings.get("styles_hash").cloned();
    let all_templates = db::layout_template::get_all(&db).await.unwrap_or_default();
    let css_parts: Vec<&str> = all_templates.iter().map(|t| t.template_css.as_str()).collect();
    let new_hash = zygo_core::models::compute_theme_styles_hash(&css_parts, Some(&all_settings));
    let _ = db::setting::set_setting(&db, "styles_hash", &new_hash).await;

    let mut purge_list = vec![
        "/".to_string(),
        "/posts".to_string(),
        "/post".to_string(),
        "/style.css".to_string(),
        format!("/style-{}.css", new_hash),
        "/sitemap.xml".to_string(),
        "/rss.xml".to_string(),
        "/feed.xml".to_string(),
    ];
    if !origin.is_empty() {
        purge_list.push(format!("{}/", origin));
        purge_list.push(format!("{}/posts", origin));
        purge_list.push(format!("{}/post", origin));
        purge_list.push(format!("{}/style.css", origin));
        purge_list.push(format!("{}/style-{}.css", origin, new_hash));
        purge_list.push(format!("{}/sitemap.xml", origin));
        purge_list.push(format!("{}/rss.xml", origin));
        purge_list.push(format!("{}/feed.xml", origin));
    }
    if let Some(old) = old_hash {
        purge_list.push(format!("/style-{}.css", old));
        if !origin.is_empty() {
            purge_list.push(format!("{}/style-{}.css", origin, old));
        }
    }

    cache::purge_urls(&ctx.env, purge_list).await;
    if !origin.is_empty() {
        cache::purge_hosts(&ctx.env, vec![origin.clone()]).await;
    }

    Response::from_json(&json!({ "success": true }))
}

pub fn format_iso8601_utc(millis: u64) -> String {
    let secs = millis / 1000;
    let days = (secs / 86400) as i64;
    let day_secs = secs % 86400;
    let hours = day_secs / 3600;
    let minutes = (day_secs % 3600) / 60;
    let seconds = day_secs % 60;

    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    if m <= 2 {
        y += 1;
    }

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, d, hours, minutes, seconds)
}

pub fn build_edge_graphql_query(zone_id: &str, start_time: &str, end_time: &str) -> serde_json::Value {
    let query = r#"query($zoneId: string!, $startTime: Time!, $endTime: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneId }) {
      httpRequestsAdaptiveGroups(
        limit: 10,
        filter: { datetime_geq: $startTime, datetime_lt: $endTime },
        orderBy: [count_DESC]
      ) {
        count
        sum { edgeResponseBytes }
        dimensions { clientRequestPath clientCountryName }
      }
    }
  }
}"#;
    serde_json::json!({
        "query": query,
        "variables": {
            "zoneId": zone_id,
            "startTime": start_time,
            "endTime": end_time
        }
    })
}

pub fn build_rum_graphql_query(account_id: &str, site_tag: &str, start_time: &str, end_time: &str) -> serde_json::Value {
    let query = r#"query($accountId: string!, $siteTag: string!, $startTime: Time!, $endTime: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountId }) {
      rumPageloadEventsAdaptiveGroups(
        limit: 10,
        filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_lt: $endTime, bot: 0 },
        orderBy: [count_DESC]
      ) {
        count
        dimensions { requestPath countryName }
      }
    }
  }
}"#;
    serde_json::json!({
        "query": query,
        "variables": {
            "accountId": account_id,
            "siteTag": site_tag,
            "startTime": start_time,
            "endTime": end_time
        }
    })
}

pub fn extract_graphql_errors(parsed: &serde_json::Value) -> Option<String> {
    if let Some(errors) = parsed.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let messages: Vec<String> = errors
                .iter()
                .filter_map(|err| {
                    err.get("message")
                        .and_then(|m| m.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| Some(err.to_string()))
                })
                .collect();
            if !messages.is_empty() {
                return Some(messages.join("; "));
            }
        }
    }
    None
}

async fn execute_cf_graphql(api_token: &str, query: &serde_json::Value) -> Result<serde_json::Value> {
    let headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", api_token))?;
    headers.set("Content-Type", "application/json")?;

    let mut request_init = RequestInit::new();
    request_init.with_method(Method::Post);
    request_init.with_headers(headers);
    let body_str = serde_json::to_string(query).unwrap_or_default();
    request_init.with_body(Some(wasm_bindgen::JsValue::from_str(&body_str)));

    let cf_req = Request::new_with_init("https://api.cloudflare.com/client/v4/graphql", &request_init)?;
    let mut response = Fetch::Request(cf_req).send().await?;
    let text = response.text().await?;
    let val: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| worker::Error::RustError(format!("Failed to parse Cloudflare GraphQL response: {}", e)))?;
    Ok(val)
}

pub async fn get_analytics(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let db = ctx.env.d1("DB")?;

    let analytics_enabled = db::setting::get_setting(&db, "analytics_enabled")
        .await?
        .map(|s| s.value.trim() == "true")
        .unwrap_or(false);

    if !analytics_enabled {
        return Response::error("Analytics disabled", 403);
    }

    let analytics_site_tag = db::setting::get_setting(&db, "analytics_site_tag")
        .await?
        .map(|s| s.value.trim().to_string())
        .unwrap_or_default();

    let get_env_opt = |k: &str| -> Option<String> {
        ctx.env
            .secret(k)
            .or_else(|_| ctx.env.var(k))
            .ok()
            .map(|v| v.to_string())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };

    let api_token = get_env_opt("CF_API_TOKEN");
    let zone_id = get_env_opt("CF_ZONE_ID");
    let account_id = get_env_opt("CF_ACCOUNT_ID");

    if api_token.is_none() || (zone_id.is_none() && account_id.is_none()) {
        return Response::from_json(&json!({
            "configured": false,
            "missing_credentials": true,
            "rum_configured": false,
            "edge_configured": false,
            "message": "Cloudflare API credentials (CF_API_TOKEN and CF_ZONE_ID / CF_ACCOUNT_ID) are not configured in worker secrets."
        }));
    }

    let api_token = api_token.unwrap();

    #[cfg(target_arch = "wasm32")]
    let now_ms = worker::Date::now().as_millis();
    #[cfg(not(target_arch = "wasm32"))]
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let start_ms = now_ms.saturating_sub(7 * 86_400_000);
    let start_time = format_iso8601_utc(start_ms);
    let end_time = format_iso8601_utc(now_ms);

    let mut edge_groups = Vec::new();
    if let Some(ref zid) = zone_id {
        let edge_query = build_edge_graphql_query(zid, &start_time, &end_time);
        let edge_res = execute_cf_graphql(&api_token, &edge_query).await?;
        if let Some(err_msg) = extract_graphql_errors(&edge_res) {
            return Ok(Response::from_json(&json!({
                "error": format!("Cloudflare GraphQL error: {}", err_msg)
            }))?.with_status(502));
        }
        if let Some(groups) = edge_res
            .pointer("/data/viewer/zones/0/httpRequestsAdaptiveGroups")
            .and_then(|v| v.as_array())
        {
            edge_groups = groups.clone();
        }
    }

    let mut rum_groups = Vec::new();
    if let Some(ref aid) = account_id {
        if !analytics_site_tag.is_empty() {
            let rum_query = build_rum_graphql_query(aid, &analytics_site_tag, &start_time, &end_time);
            let rum_res = execute_cf_graphql(&api_token, &rum_query).await?;
            if let Some(err_msg) = extract_graphql_errors(&rum_res) {
                return Ok(Response::from_json(&json!({
                    "error": format!("Cloudflare GraphQL error: {}", err_msg)
                }))?.with_status(502));
            }
            if let Some(groups) = rum_res
                .pointer("/data/viewer/accounts/0/rumPageloadEventsAdaptiveGroups")
                .and_then(|v| v.as_array())
            {
                rum_groups = groups.clone();
            }
        }
    }

    let rum_configured = account_id.is_some() && !analytics_site_tag.is_empty();
    let edge_configured = zone_id.is_some();
    let site_tag_configured = !analytics_site_tag.is_empty();

    Response::from_json(&json!({
        "configured": true,
        "missing_credentials": false,
        "rum_configured": rum_configured,
        "edge_configured": edge_configured,
        "site_tag_configured": site_tag_configured,
        "rum": {
            "groups": rum_groups
        },
        "edge": {
            "groups": edge_groups
        },
        "data": {
            "viewer": {
                "accounts": [{ "rumPageloadEventsAdaptiveGroups": rum_groups }],
                "zones": [{ "httpRequestsAdaptiveGroups": edge_groups }]
            }
        }
    }))
}

pub async fn get_me(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    Response::from_json(&user)
}

pub fn redact_settings(map: &mut serde_json::Map<String, serde_json::Value>) {
    if let Some(val) = map.get_mut("turnstile_secret_key") {
        if let serde_json::Value::String(s) = val {
            if !s.trim().is_empty() {
                *val = serde_json::Value::String("••••••••".to_string());
            }
        }
    }
}

pub async fn get_settings(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let db = ctx.env.d1("DB")?;
    let settings = db::setting::get_all_settings(&db).await?;
    
    let mut map = serde_json::Map::new();
    for setting in settings {
        map.insert(setting.key, serde_json::Value::String(setting.value));
    }

    let needs_fallback = match map.get("canonical_origin") {
        None => true,
        Some(serde_json::Value::String(s)) => s.trim().is_empty(),
        _ => false,
    };
    if needs_fallback {
        let fallback_origin = get_fallback_origin(&req, &ctx.env)?;
        map.insert("canonical_origin".to_string(), serde_json::Value::String(fallback_origin));
    }

    redact_settings(&mut map);
    
    Response::from_json(&serde_json::Value::Object(map))
}

pub async fn auth_login(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let next = url.query_pairs().find(|(k, _)| k == "next").map(|(_, v)| v.to_string()).unwrap_or_else(|| "https://admin.zygodactylstudios.com".to_string());
    Response::redirect(worker::Url::parse(&next)?)
}

pub async fn preview(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let token = match ctx.param("token") {
        Some(t) => t,
        None => return Response::error("Missing token", 400),
    };
    let db = ctx.env.d1("DB")?;
    let origin = resolve_canonical_origin(&req, &ctx.env, &db).await?;
    let preview_url = format!("{}/preview/{}", origin, token);
    let client_req = Request::new(&preview_url, Method::Get)?;
    let mut resp = match Fetch::Request(client_req).send().await {
        Ok(r) => r,
        Err(e) => return Response::error(format!("Failed to fetch preview: {e}"), 502),
    };
    let bytes = resp.bytes().await?;
    let headers = resp.headers().clone();
    let _ = headers.delete("x-frame-options");
    let _ = headers.delete("X-Frame-Options");
    let _ = headers.set("Content-Security-Policy", "frame-ancestors *");
    let _ = headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    Response::from_bytes(bytes).map(|res| res.with_headers(headers))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_settings_masks_turnstile_secret_key() {
        let mut map = serde_json::Map::new();
        map.insert(
            "site_title".to_string(),
            serde_json::Value::String("My Site".to_string()),
        );
        map.insert(
            "turnstile_site_key".to_string(),
            serde_json::Value::String("0x4AAAAAAAJ-sitekey".to_string()),
        );
        map.insert(
            "turnstile_secret_key".to_string(),
            serde_json::Value::String("0x4AAAAAAAJ-supersecretkey".to_string()),
        );

        redact_settings(&mut map);

        assert_eq!(
            map.get("site_title").unwrap().as_str().unwrap(),
            "My Site"
        );
        assert_eq!(
            map.get("turnstile_site_key").unwrap().as_str().unwrap(),
            "0x4AAAAAAAJ-sitekey"
        );
        assert_eq!(
            map.get("turnstile_secret_key").unwrap().as_str().unwrap(),
            "••••••••"
        );
    }

    #[test]
    fn test_redact_settings_ignores_empty_turnstile_secret_key() {
        let mut map = serde_json::Map::new();
        map.insert(
            "turnstile_secret_key".to_string(),
            serde_json::Value::String("".to_string()),
        );

        redact_settings(&mut map);

        assert_eq!(
            map.get("turnstile_secret_key").unwrap().as_str().unwrap(),
            ""
        );
    }

    #[test]
    fn test_redact_settings_absent_key() {
        let mut map = serde_json::Map::new();
        map.insert(
            "site_title".to_string(),
            serde_json::Value::String("My Site".to_string()),
        );

        redact_settings(&mut map);

        assert!(map.get("turnstile_secret_key").is_none());
    }

    #[test]
    fn test_validate_author_entry_creation_rbac() {
        // Author restricted statuses
        for &status in AUTHOR_RESTRICTED_STATUSES {
            let res = validate_author_entry_creation("author", Some(status));
            assert_eq!(
                res,
                Err("Authors cannot create entries directly in published, ready for publish, or archived status. Please submit for review.")
            );
        }

        // Author allowed statuses
        assert!(validate_author_entry_creation("author", Some("draft")).is_ok());
        assert!(validate_author_entry_creation("author", Some("in_review")).is_ok());
        assert!(validate_author_entry_creation("author", None).is_ok());

        // Admin and Editor can create with any status
        for &status in AUTHOR_RESTRICTED_STATUSES {
            assert!(validate_author_entry_creation("admin", Some(status)).is_ok());
            assert!(validate_author_entry_creation("editor", Some(status)).is_ok());
        }
    }

    #[test]
    fn test_validate_author_entry_update_rbac() {
        // Author restricted statuses
        for &status in AUTHOR_RESTRICTED_STATUSES {
            let res = validate_author_entry_update("author", Some(status));
            assert_eq!(
                res,
                Err("Authors cannot publish or archive entries directly. Please submit for review.")
            );
        }

        // Author allowed statuses
        assert!(validate_author_entry_update("author", Some("draft")).is_ok());
        assert!(validate_author_entry_update("author", Some("in_review")).is_ok());
        assert!(validate_author_entry_update("author", None).is_ok());

        // Admin and Editor can update with any status
        for &status in AUTHOR_RESTRICTED_STATUSES {
            assert!(validate_author_entry_update("admin", Some(status)).is_ok());
            assert!(validate_author_entry_update("editor", Some(status)).is_ok());
        }
    }

    #[test]
    fn test_validate_author_bulk_action_rbac() {
        // Author cannot bulk publish
        let res = validate_author_bulk_action("author", models::BulkActionType::Publish);
        assert_eq!(
            res,
            Err("Authors cannot publish or archive entries directly. Please submit for review.")
        );

        // Author can perform other bulk actions
        assert!(validate_author_bulk_action("author", models::BulkActionType::Unpublish).is_ok());
        assert!(validate_author_bulk_action("author", models::BulkActionType::Trash).is_ok());
        assert!(validate_author_bulk_action("author", models::BulkActionType::AddTags).is_ok());
        assert!(validate_author_bulk_action("author", models::BulkActionType::RemoveTags).is_ok());

        // Admin and Editor can bulk publish
        assert!(validate_author_bulk_action("admin", models::BulkActionType::Publish).is_ok());
        assert!(validate_author_bulk_action("editor", models::BulkActionType::Publish).is_ok());
    }

    #[test]
    fn test_format_iso8601_utc() {
        assert_eq!(format_iso8601_utc(0), "1970-01-01T00:00:00Z");
        assert_eq!(format_iso8601_utc(1700000000_000), "2023-11-14T22:13:20Z");
        // Leap year 2024: 2024-02-29 13:00:00 UTC (1709211600 seconds)
        assert_eq!(format_iso8601_utc(1709211600_000), "2024-02-29T13:00:00Z");
        // End of year 2024: 2024-12-31 23:59:59 UTC (1735689599 seconds)
        assert_eq!(format_iso8601_utc(1735689599_000), "2024-12-31T23:59:59Z");
    }

    #[test]
    fn test_build_edge_graphql_query() {
        let payload = build_edge_graphql_query("zone-xyz-123", "2026-10-18T00:00:00Z", "2026-10-25T00:00:00Z");
        let query_str = payload.get("query").and_then(|q| q.as_str()).expect("query string");
        let vars = payload.get("variables").expect("variables object");

        assert_eq!(vars.get("zoneId").and_then(|v| v.as_str()), Some("zone-xyz-123"));
        assert_eq!(vars.get("startTime").and_then(|v| v.as_str()), Some("2026-10-18T00:00:00Z"));
        assert_eq!(vars.get("endTime").and_then(|v| v.as_str()), Some("2026-10-25T00:00:00Z"));

        assert!(query_str.contains("datetime_geq: $startTime"));
        assert!(query_str.contains("datetime_lt: $endTime"));
        assert!(query_str.contains("httpRequestsAdaptiveGroups"));
        assert!(query_str.contains("edgeResponseBytes"));
        assert!(query_str.contains("clientRequestPath"));
        assert!(query_str.contains("clientCountryName"));
    }

    #[test]
    fn test_build_rum_graphql_query() {
        let payload = build_rum_graphql_query("account-abc-456", "site-tag-789", "2026-10-18T00:00:00Z", "2026-10-25T00:00:00Z");
        let query_str = payload.get("query").and_then(|q| q.as_str()).expect("query string");
        let vars = payload.get("variables").expect("variables object");

        assert_eq!(vars.get("accountId").and_then(|v| v.as_str()), Some("account-abc-456"));
        assert_eq!(vars.get("siteTag").and_then(|v| v.as_str()), Some("site-tag-789"));
        assert_eq!(vars.get("startTime").and_then(|v| v.as_str()), Some("2026-10-18T00:00:00Z"));
        assert_eq!(vars.get("endTime").and_then(|v| v.as_str()), Some("2026-10-25T00:00:00Z"));

        assert!(query_str.contains("accounts(filter: { accountTag: $accountId })"));
        assert!(query_str.contains("rumPageloadEventsAdaptiveGroups"));
        assert!(query_str.contains("siteTag: $siteTag"));
        assert!(query_str.contains("countryName"));
        assert!(query_str.contains("requestPath"));
        assert!(query_str.contains("bot: 0"));
    }

    #[test]
    fn test_extract_graphql_errors() {
        let err_json = serde_json::json!({
            "errors": [
                { "message": "Invalid zone tag" },
                { "message": "Rate limit exceeded" }
            ]
        });
        assert_eq!(
            extract_graphql_errors(&err_json),
            Some("Invalid zone tag; Rate limit exceeded".to_string())
        );

        let empty_err_json = serde_json::json!({
            "errors": []
        });
        assert_eq!(extract_graphql_errors(&empty_err_json), None);

        let no_err_json = serde_json::json!({
            "data": { "viewer": {} }
        });
        assert_eq!(extract_graphql_errors(&no_err_json), None);
    }
}
