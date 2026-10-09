use crate::auth_required;
use serde::Deserialize;
use serde_json::json;
use worker::wasm_bindgen::JsValue;
use worker::{Request, Response, Result, RouteContext};
use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::{SectionTemplateField, SectionTemplatePayload};

#[derive(Deserialize)]
struct CollisionRow {
    name: String,
    #[serde(default)]
    class_name: Option<String>,
}

#[derive(Deserialize)]
struct CountResult {
    count: i64,
}

#[derive(Deserialize)]
struct EntryPathRow {
    path: Option<String>,
}

pub fn extract_css_classes(css: &str) -> Vec<String> {
    let mut classes = Vec::new();
    let bytes = css.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'.' {
            i += 1;
            let start = i;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_' || bytes[i] == b'-') {
                i += 1;
            }
            if i > start {
                let class_name = &css[start..i];
                if !classes.iter().any(|c| c == class_name) {
                    classes.push(class_name.to_string());
                }
            }
        } else {
            i += 1;
        }
    }
    classes
}

pub fn is_breaking_schema_change(old_schema_json: &str, new_schema_json: &str) -> bool {
    let old_fields: Vec<SectionTemplateField> = serde_json::from_str(old_schema_json).unwrap_or_default();
    let new_fields: Vec<SectionTemplateField> = serde_json::from_str(new_schema_json).unwrap_or_default();

    for old_field in &old_fields {
        match new_fields.iter().find(|nf| nf.name == old_field.name) {
            None => return true,
            Some(nf) if nf.r#type != old_field.r#type => return true,
            _ => {}
        }
    }
    false
}

async fn purge_template_usage_cache(
    env: &worker::Env,
    req: &Request,
    d1: &worker::D1Database,
    id: &str,
) {
    let origin = match req.url() {
        Ok(u) => u.origin().ascii_serialization(),
        Err(_) => return,
    };
    if origin.is_empty() {
        return;
    }

    let patterns = [
        format!("%\"type_id\":\"{}\"%", id),
        format!("%\"type_id\": \"{}\"%", id),
        format!("%\"template_id\":\"{}\"%", id),
        format!("%\"template_id\": \"{}\"%", id),
        format!("%\"type\":\"{}\"%", id),
        format!("%\"type\": \"{}\"%", id),
    ];

    let query = "SELECT path FROM entries \
                 WHERE deleted_at IS NULL AND ( \
                     body_json LIKE ?1 OR body_json LIKE ?2 OR \
                     body_json LIKE ?3 OR body_json LIKE ?4 OR \
                     body_json LIKE ?5 OR body_json LIKE ?6 \
                 )";

    let mut purge_list = vec![
        format!("{}/", origin),
        format!("{}/rss.xml", origin),
        format!("{}/sitemap.xml", origin),
    ];

    if let Ok(stmt) = d1.prepare(query).bind(&[
        patterns[0].as_str().into(),
        patterns[1].as_str().into(),
        patterns[2].as_str().into(),
        patterns[3].as_str().into(),
        patterns[4].as_str().into(),
        patterns[5].as_str().into(),
    ]) {
        if let Ok(res) = stmt.all().await {
            if let Ok(rows) = res.results::<EntryPathRow>() {
                for row in rows {
                    if let Some(path) = row.path {
                        let clean_path = if path.starts_with('/') { path } else { format!("/{}", path) };
                        let full_url = format!("{}{}", origin, clean_path);
                        if !purge_list.contains(&full_url) {
                            purge_list.push(full_url);
                        }
                    }
                }
            }
        }
    }

    crate::cache::purge_urls(env, purge_list).await;
}

pub async fn list_section_templates(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let templates = db::section_template::get_all(&d1).await?;
    Response::from_json(&templates)
}

pub async fn get_section_template(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    match db::section_template::get_by_id(&d1, id).await? {
        Some(st) => Response::from_json(&st),
        None => AppError::NotFound.to_response(),
    }
}

pub async fn upsert_section_template(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" && user.role != "designer" {
        return AppError::Unauthorized("Only admins and designers can manage section templates".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let mut payload = match req.json::<SectionTemplatePayload>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON payload".into()).to_response(),
    };

    let id = match ctx.param("id") {
        Some(param_id) => param_id.to_string(),
        None => match &payload.id {
            Some(pid) if !pid.trim().is_empty() => pid.trim().to_string(),
            _ => return AppError::BadRequest("Missing template ID".into()).to_response(),
        },
    };

    let is_force = payload.force.unwrap_or(false)
        || req
            .url()
            .ok()
            .map(|u| u.query_pairs().any(|(k, v)| k == "force" && v == "true"))
            .unwrap_or(false);

    // Server-side template validation
    let validation = zygo_core::template_validation::validate_template(
        payload.template_html.as_deref().unwrap_or_default(),
        &payload.schema_json,
    );

    if !validation.is_valid {
        return Response::from_json(&json!({
            "error": "Template validation failed",
            "errors": validation.errors,
            "warnings": validation.warnings,
        }))
        .map(|r| r.with_status(400));
    }

    if !validation.warnings.is_empty() && !is_force {
        return Response::from_json(&json!({
            "requires_confirmation": true,
            "error": "Template contains warnings that require confirmation",
            "warnings": validation.warnings,
        }))
        .map(|r| r.with_status(400));
    }

    let existing_template = db::section_template::get_by_id(&d1, &id).await?;
    if user.role == "designer" {
        if let Some(ref old_st) = existing_template {
            if old_st.is_locked {
                return AppError::Unauthorized("Designers cannot edit locked templates".into()).to_response();
            }
        }
        if payload.is_locked.is_some() {
            return AppError::Unauthorized("Only admins can toggle template locks".into()).to_response();
        }
    }

    // CSS Extraction: Extract class selectors and set css_classes_json
    let classes = match &payload.template_css {
        Some(css) => extract_css_classes(css),
        None => Vec::new(),
    };
    let css_classes_json = serde_json::to_string(&classes).unwrap_or_else(|_| "[]".to_string());
    payload.css_classes_json = Some(css_classes_json);

    // CSS Collision Detection: Check if extracted classes collide with other templates
    if !classes.is_empty() {
        let placeholders = (0..classes.len())
            .map(|i| format!("?{}", i + 2))
            .collect::<Vec<_>>()
            .join(", ");
        let query = format!(
            "SELECT section_templates.name as name, json_each.value as class_name \
             FROM section_templates, json_each(CASE WHEN json_valid(section_templates.css_classes_json) THEN section_templates.css_classes_json ELSE '[]' END) \
             WHERE section_templates.id != ?1 AND json_each.value IN ({})",
            placeholders
        );
        let mut binds: Vec<JsValue> = Vec::with_capacity(classes.len() + 1);
        binds.push((&id).into());
        for c in &classes {
            binds.push(c.as_str().into());
        }
        let stmt = d1.prepare(&query);
        let rows = stmt.bind(&binds)?.all().await?.results::<CollisionRow>()?;
        if let Some(first) = rows.first() {
            let msg = match &first.class_name {
                Some(cls) => format!(
                    "CSS class collision: class '{}' is already in use by section template '{}'",
                    cls, first.name
                ),
                None => format!(
                    "CSS class collision detected with section template '{}'",
                    first.name
                ),
            };
            return AppError::Conflict(msg).to_response();
        }
    }

    // Breaking Schema Change Detection: Compare payload with old schema
    if let Some(ref old_st) = existing_template {
        if is_breaking_schema_change(&old_st.schema_json, &payload.schema_json) {
            if !is_force {
                let patterns = [
                    format!("%\"type_id\":\"{}\"%", id),
                    format!("%\"type_id\": \"{}\"%", id),
                    format!("%\"template_id\":\"{}\"%", id),
                    format!("%\"template_id\": \"{}\"%", id),
                    format!("%\"type\":\"{}\"%", id),
                    format!("%\"type\": \"{}\"%", id),
                ];
                let count_stmt = d1.prepare(
                    "SELECT count(*) as count FROM entries \
                     WHERE deleted_at IS NULL AND ( \
                         body_json LIKE ?1 OR body_json LIKE ?2 OR \
                         body_json LIKE ?3 OR body_json LIKE ?4 OR \
                         body_json LIKE ?5 OR body_json LIKE ?6 \
                     )"
                );
                let count_res = count_stmt
                    .bind(&[
                        patterns[0].as_str().into(),
                        patterns[1].as_str().into(),
                        patterns[2].as_str().into(),
                        patterns[3].as_str().into(),
                        patterns[4].as_str().into(),
                        patterns[5].as_str().into(),
                    ])?
                    .first::<CountResult>(None)
                    .await?;
                let usage_count = count_res.map(|c| c.count).unwrap_or(0);
                if usage_count > 0 {
                    return AppError::Conflict(format!(
                        "Breaking schema change detected for section template '{}' which is actively used in {} entry/entries. Use force=true to override.",
                        id, usage_count
                    )).to_response();
                }
            }
        }
    }

    if let Some(ref old_st) = existing_template {
        let rev = zygo_core::models::SectionTemplateRevision {
            id: crate::utils::generate_id(),
            section_template_id: old_st.id.clone(),
            name: old_st.name.clone(),
            description: old_st.description.clone(),
            schema_json: old_st.schema_json.clone(),
            template_html: old_st.template_html.clone(),
            template_css: old_st.template_css.clone(),
            css_classes_json: old_st.css_classes_json.clone(),
            is_locked: old_st.is_locked,
            created_at: String::new(),
        };
        let _ = db::section_template::create_revision(&d1, &rev).await;
        let _ = db::section_template::prune_revisions(&d1, &id, 20).await;
    }

    match db::section_template::upsert(&d1, &id, &payload).await {
        Ok(_) => {
            purge_template_usage_cache(&ctx.env, &req, &d1, &id).await;
            Response::from_json(&json!({"success": true}))
        }
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn delete_section_template(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return AppError::Unauthorized("Only admins can delete section templates".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    
    // Delete safety: check if live (non-trashed) entries use this template
    let patterns = [
        format!("%\"type_id\":\"{}\"%", id),
        format!("%\"type_id\": \"{}\"%", id),
        format!("%\"template_id\":\"{}\"%", id),
        format!("%\"template_id\": \"{}\"%", id),
        format!("%\"type\":\"{}\"%", id),
        format!("%\"type\": \"{}\"%", id),
    ];
    let count_stmt = d1.prepare(
        "SELECT count(*) as count FROM entries \
         WHERE deleted_at IS NULL AND ( \
             body_json LIKE ?1 OR body_json LIKE ?2 OR \
             body_json LIKE ?3 OR body_json LIKE ?4 OR \
             body_json LIKE ?5 OR body_json LIKE ?6 \
         )"
    );
    let count_res = count_stmt
        .bind(&[
            patterns[0].as_str().into(),
            patterns[1].as_str().into(),
            patterns[2].as_str().into(),
            patterns[3].as_str().into(),
            patterns[4].as_str().into(),
            patterns[5].as_str().into(),
        ])?
        .first::<CountResult>(None)
        .await?;
    let usage_count = count_res.map(|c| c.count).unwrap_or(0);
    if usage_count > 0 {
        let pages_label = if usage_count == 1 { "page" } else { "pages" };
        return AppError::Conflict(format!("Used on {} {}", usage_count, pages_label)).to_response();
    }
    
    match db::section_template::delete(&d1, id).await {
        Ok(true) => {
            purge_template_usage_cache(&ctx.env, &req, &d1, id).await;
            Response::from_json(&json!({"success": true}))
        }
        Ok(false) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

// Aliases for backwards compatibility
#[allow(unused_imports)]
pub use list_section_templates as list_content_types;
#[allow(unused_imports)]
pub use get_section_template as get_content_type;
#[allow(unused_imports)]
pub use upsert_section_template as upsert_content_type;
#[allow(unused_imports)]
pub use delete_section_template as delete_content_type;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_css_classes_empty() {
        assert_eq!(extract_css_classes(""), Vec::<String>::new());
        assert_eq!(extract_css_classes("body { margin: 0; }"), Vec::<String>::new());
    }

    #[test]
    fn test_extract_css_classes_basic() {
        let css = ".hero { color: red; }";
        assert_eq!(extract_css_classes(css), vec!["hero"]);
    }

    #[test]
    fn test_extract_css_classes_multiple_and_dedup() {
        let css = ".hero { color: red; } .hero-title, .badge_active { font-size: 14px; } .hero { margin: 0; }";
        assert_eq!(
            extract_css_classes(css),
            vec!["hero", "hero-title", "badge_active"]
        );
    }

    #[test]
    fn test_extract_css_classes_complex_selectors() {
        let css = ".card.active > .card__header:hover::after { content: ''; }";
        assert_eq!(
            extract_css_classes(css),
            vec!["card", "active", "card__header"]
        );
    }

    #[test]
    fn test_is_breaking_schema_change_identical() {
        let schema = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}]"#;
        assert!(!is_breaking_schema_change(schema, schema));
    }

    #[test]
    fn test_is_breaking_schema_change_added_field() {
        let old = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}]"#;
        let new = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}, {"name": "sub", "type": "text", "label": "Sub", "required": false}]"#;
        assert!(!is_breaking_schema_change(old, new));
    }

    #[test]
    fn test_is_breaking_schema_change_removed_field() {
        let old = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}, {"name": "sub", "type": "text", "label": "Sub", "required": false}]"#;
        let new = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}]"#;
        assert!(is_breaking_schema_change(old, new));
    }

    #[test]
    fn test_is_breaking_schema_change_type_changed() {
        let old = r#"[{"name": "count", "type": "number", "label": "Count", "required": true}]"#;
        let new = r#"[{"name": "count", "type": "text", "label": "Count", "required": true}]"#;
        assert!(is_breaking_schema_change(old, new));
    }

    #[test]
    fn test_is_breaking_schema_change_label_or_required_change_not_breaking() {
        let old = r#"[{"name": "title", "type": "text", "label": "Title", "required": true}]"#;
        let new = r#"[{"name": "title", "type": "text", "label": "New Title", "required": false}]"#;
        assert!(!is_breaking_schema_change(old, new));
    }
}

pub async fn list_section_template_revisions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    
    match zygo_core::db::section_template::get_revisions_list(&d1, id).await {
        Ok(revisions) => Response::from_json(&serde_json::json!({"data": revisions})),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn restore_section_template_revision(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    let revision_id = ctx.param("revision_id").unwrap();
    
    let revision = match zygo_core::db::section_template::get_revision(&d1, revision_id).await {
        Ok(Some(r)) => r,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if revision.section_template_id != *id {
        return AppError::BadRequest("Revision does not belong to this template".into()).to_response();
    }

    // Before restoring, save the CURRENT state as a revision
    if let Ok(Some(current_st)) = zygo_core::db::section_template::get_by_id(&d1, id).await {
        let backup_rev = zygo_core::models::SectionTemplateRevision {
            id: crate::utils::generate_id(),
            section_template_id: current_st.id.clone(),
            name: current_st.name.clone(),
            description: current_st.description.clone(),
            schema_json: current_st.schema_json.clone(),
            template_html: current_st.template_html.clone(),
            template_css: current_st.template_css.clone(),
            css_classes_json: current_st.css_classes_json.clone(),
            is_locked: current_st.is_locked,
            created_at: String::new(),
        };
        let _ = zygo_core::db::section_template::create_revision(&d1, &backup_rev).await;
        let _ = zygo_core::db::section_template::prune_revisions(&d1, id, 20).await;
    }

    let payload = zygo_core::models::SectionTemplatePayload {
        id: Some(id.clone()),
        name: revision.name,
        description: revision.description,
        schema_json: revision.schema_json,
        template_html: revision.template_html,
        template_css: revision.template_css,
        css_classes_json: Some(revision.css_classes_json),
        is_locked: Some(revision.is_locked),
        force: Some(true),
    };

    match zygo_core::db::section_template::upsert(&d1, id, &payload).await {
        Ok(_) => {
            crate::handlers::section_templates::purge_template_usage_cache(&ctx.env, &req, &d1, id).await;
            Response::from_json(&serde_json::json!({"success": true}))
        }
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}
