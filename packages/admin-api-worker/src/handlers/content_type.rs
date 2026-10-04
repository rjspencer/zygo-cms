use crate::auth_required;
use serde::Deserialize;
use serde_json::json;
use worker::wasm_bindgen::JsValue;
use worker::{Request, Response, Result, RouteContext};
use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::{ContentTypeField, ContentTypePayload};

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
    let old_fields: Vec<ContentTypeField> = serde_json::from_str(old_schema_json).unwrap_or_default();
    let new_fields: Vec<ContentTypeField> = serde_json::from_str(new_schema_json).unwrap_or_default();

    for old_field in &old_fields {
        match new_fields.iter().find(|nf| nf.name == old_field.name) {
            None => return true,
            Some(nf) if nf.r#type != old_field.r#type => return true,
            _ => {}
        }
    }
    false
}

pub async fn list_content_types(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let types = db::content_type::get_all(&d1).await?;
    Response::from_json(&types)
}

pub async fn get_content_type(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    match db::content_type::get_by_id(&d1, id).await? {
        Some(ct) => Response::from_json(&ct),
        None => AppError::NotFound.to_response(),
    }
}

pub async fn upsert_content_type(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return AppError::Unauthorized("Only admins can manage content types".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    let mut payload = match req.json::<ContentTypePayload>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON payload".into()).to_response(),
    };

    // 3a. CSS Extraction: Extract class selectors and set css_classes_json
    let classes = match &payload.template_css {
        Some(css) => extract_css_classes(css),
        None => Vec::new(),
    };
    let css_classes_json = serde_json::to_string(&classes).unwrap_or_else(|_| "[]".to_string());
    payload.css_classes_json = Some(css_classes_json);

    // 3b. CSS Collision Detection: Check if extracted classes collide with other templates
    if !classes.is_empty() {
        let placeholders = (0..classes.len())
            .map(|i| format!("?{}", i + 2))
            .collect::<Vec<_>>()
            .join(", ");
        let query = format!(
            "SELECT content_types.name as name, json_each.value as class_name \
             FROM content_types, json_each(CASE WHEN json_valid(content_types.css_classes_json) THEN content_types.css_classes_json ELSE '[]' END) \
             WHERE content_types.id != ?1 AND json_each.value IN ({})",
            placeholders
        );
        let mut binds: Vec<JsValue> = Vec::with_capacity(classes.len() + 1);
        binds.push(id.into());
        for c in &classes {
            binds.push(c.as_str().into());
        }
        let stmt = d1.prepare(&query);
        let rows = stmt.bind(&binds)?.all().await?.results::<CollisionRow>()?;
        if let Some(first) = rows.first() {
            let msg = match &first.class_name {
                Some(cls) => format!(
                    "CSS class collision: class '{}' is already in use by content type '{}'",
                    cls, first.name
                ),
                None => format!(
                    "CSS class collision detected with content type '{}'",
                    first.name
                ),
            };
            return AppError::Conflict(msg).to_response();
        }
    }

    // 3c. Breaking Schema Change Detection: Compare payload with old schema
    if let Some(old_ct) = db::content_type::get_by_id(&d1, id).await? {
        if is_breaking_schema_change(&old_ct.schema_json, &payload.schema_json) {
            let is_force = req
                .url()
                .ok()
                .map(|u| u.query_pairs().any(|(k, v)| k == "force" && v == "true"))
                .unwrap_or(false);

            if !is_force {
                let pattern1 = format!("%\"type\":\"{}\"%", id);
                let pattern2 = format!("%\"type\": \"{}\"%", id);
                let count_stmt = d1.prepare(
                    "SELECT count(*) as count FROM entries WHERE body_json LIKE ?1 OR body_json LIKE ?2"
                );
                let count_res = count_stmt
                    .bind(&[pattern1.into(), pattern2.into()])?
                    .first::<CountResult>(None)
                    .await?;
                let usage_count = count_res.map(|c| c.count).unwrap_or(0);
                if usage_count > 0 {
                    return AppError::Conflict(format!(
                        "Breaking schema change detected for content type '{}' which is actively used in {} entry/entries. Use force=true to override.",
                        id, usage_count
                    )).to_response();
                }
            }
        }
    }

    match db::content_type::upsert(&d1, id, &payload).await {
        Ok(_) => Response::from_json(&json!({"success": true})),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn delete_content_type(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return AppError::Unauthorized("Only admins can manage content types".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    
    if id == "post" || id == "page" {
        return AppError::BadRequest("Cannot delete core content types".into()).to_response();
    }
    
    match db::content_type::delete(&d1, id).await {
        Ok(true) => Response::from_json(&json!({"success": true})),
        Ok(false) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

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
