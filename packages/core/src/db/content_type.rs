use super::opt_js;
use crate::models::{ContentType, ContentTypePayload};
use worker::{D1Database, Result};

pub async fn get_all(db: &D1Database) -> Result<Vec<ContentType>> {
    let statement = db.prepare("SELECT * FROM content_types ORDER BY name ASC");
    let result = statement.run().await?;
    result.results::<ContentType>()
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<ContentType>> {
    let statement = db.prepare("SELECT * FROM content_types WHERE id = ?1");
    statement.bind(&[id.into()])?.first::<ContentType>(None).await
}

pub async fn upsert(db: &D1Database, id: &str, payload: &ContentTypePayload) -> Result<bool> {
    let statement = db.prepare(
        "INSERT INTO content_types (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, COALESCE(?8, 0))
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            schema_json = excluded.schema_json,
            template_html = excluded.template_html,
            template_css = excluded.template_css,
            css_classes_json = excluded.css_classes_json,
            is_locked = CASE WHEN ?8 IS NOT NULL THEN excluded.is_locked ELSE content_types.is_locked END,
            updated_at = CURRENT_TIMESTAMP"
    );
    let css_classes = payload.css_classes_json.as_deref().unwrap_or("[]");
    let locked_js = match payload.is_locked {
        Some(true) => worker::wasm_bindgen::JsValue::from(1),
        Some(false) => worker::wasm_bindgen::JsValue::from(0),
        None => worker::wasm_bindgen::JsValue::NULL,
    };
    let result = statement.bind(&[
        id.into(),
        payload.name.as_str().into(),
        opt_js(&payload.description),
        payload.schema_json.as_str().into(),
        opt_js(&payload.template_html),
        opt_js(&payload.template_css),
        css_classes.into(),
        locked_js,
    ])?.run().await?;
    
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn delete(db: &D1Database, id: &str) -> Result<bool> {
    let statement = db.prepare("DELETE FROM content_types WHERE id = ?1");
    let result = statement.bind(&[id.into()])?.run().await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}
