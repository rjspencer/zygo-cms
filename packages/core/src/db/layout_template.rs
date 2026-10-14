use super::opt_js;
use crate::models::{LayoutTemplate, LayoutTemplatePayload, LayoutTemplateRevision};
use worker::{D1Database, Result};

const ALL_COLUMNS: &str = "id, name, description, template_html, template_css, is_locked, created_at, updated_at";
const REVISION_COLUMNS: &str = "id, layout_template_id, template_html, template_css, created_at";

pub async fn get_all(db: &D1Database) -> Result<Vec<LayoutTemplate>> {
    let query = format!("SELECT {} FROM layout_templates ORDER BY id ASC", ALL_COLUMNS);
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<LayoutTemplate>()
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<LayoutTemplate>> {
    let query = format!("SELECT {} FROM layout_templates WHERE id = ?1", ALL_COLUMNS);
    let statement = db.prepare(&query);
    statement.bind(&[id.into()])?.first::<LayoutTemplate>(None).await
}

pub async fn upsert(db: &D1Database, id: &str, payload: &LayoutTemplatePayload) -> Result<bool> {
    let statement = db.prepare(
        "INSERT INTO layout_templates (id, name, description, template_html, template_css, is_locked)
         VALUES (?1, ?2, ?3, ?4, ?5, COALESCE(?6, 0))
         ON CONFLICT(id) DO UPDATE SET
            name = CASE WHEN ?2 IS NOT NULL THEN excluded.name ELSE layout_templates.name END,
            description = CASE WHEN ?3 IS NOT NULL THEN excluded.description ELSE layout_templates.description END,
            template_html = CASE WHEN ?4 IS NOT NULL THEN excluded.template_html ELSE layout_templates.template_html END,
            template_css = CASE WHEN ?5 IS NOT NULL THEN excluded.template_css ELSE layout_templates.template_css END,
            is_locked = CASE WHEN ?6 IS NOT NULL THEN excluded.is_locked ELSE layout_templates.is_locked END,
            updated_at = CURRENT_TIMESTAMP"
    );

    let locked_js = match payload.is_locked {
        Some(true) => worker::wasm_bindgen::JsValue::from(1),
        Some(false) => worker::wasm_bindgen::JsValue::from(0),
        None => worker::wasm_bindgen::JsValue::NULL,
    };

    let result = statement.bind(&[
        id.into(),
        opt_js(&payload.name),
        opt_js(&payload.description),
        opt_js(&payload.template_html),
        opt_js(&payload.template_css),
        locked_js,
    ])?.run().await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn create_revision(db: &D1Database, revision: &LayoutTemplateRevision) -> Result<()> {
    let statement = db.prepare(
        "INSERT INTO layout_template_revisions (id, layout_template_id, template_html, template_css)
         VALUES (?1, ?2, ?3, ?4)"
    );
    statement.bind(&[
        revision.id.as_str().into(),
        revision.layout_template_id.as_str().into(),
        revision.template_html.as_str().into(),
        revision.template_css.as_str().into(),
    ])?.run().await?;
    Ok(())
}

pub async fn get_revisions(db: &D1Database, layout_template_id: &str) -> Result<Vec<LayoutTemplateRevision>> {
    let query = format!(
        "SELECT {} FROM layout_template_revisions WHERE layout_template_id = ?1 ORDER BY created_at DESC",
        REVISION_COLUMNS
    );
    let statement = db.prepare(&query);
    let result = statement.bind(&[layout_template_id.into()])?.run().await?;
    result.results::<LayoutTemplateRevision>()
}

pub async fn get_revision_by_id(db: &D1Database, revision_id: &str) -> Result<Option<LayoutTemplateRevision>> {
    let query = format!(
        "SELECT {} FROM layout_template_revisions WHERE id = ?1",
        REVISION_COLUMNS
    );
    let statement = db.prepare(&query);
    statement.bind(&[revision_id.into()])?.first::<LayoutTemplateRevision>(None).await
}

pub async fn restore_revision(db: &D1Database, layout_template_id: &str, revision_id: &str) -> Result<bool> {
    let rev = match get_revision_by_id(db, revision_id).await? {
        Some(r) => r,
        None => return Ok(false),
    };

    let statement = db.prepare(
        "UPDATE layout_templates 
         SET template_html = ?1, template_css = ?2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?3"
    );
    let result = statement.bind(&[
        rev.template_html.as_str().into(),
        rev.template_css.as_str().into(),
        layout_template_id.into(),
    ])?.run().await?;

    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}
