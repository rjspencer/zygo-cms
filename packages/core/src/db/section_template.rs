use super::opt_js;
use crate::models::{SectionTemplate, SectionTemplatePayload, SectionTemplateRevision, SectionTemplateRevisionListItem};
use worker::{D1Database, Result};

const ALL_COLUMNS: &str = "id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked, created_at, updated_at";

pub async fn get_all(db: &D1Database) -> Result<Vec<SectionTemplate>> {
    let query = format!("SELECT {} FROM section_templates ORDER BY name ASC", ALL_COLUMNS);
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    result.results::<SectionTemplate>()
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<SectionTemplate>> {
    let query = format!("SELECT {} FROM section_templates WHERE id = ?1", ALL_COLUMNS);
    let statement = db.prepare(&query);
    statement.bind(&[id.into()])?.first::<SectionTemplate>(None).await
}

pub async fn upsert(db: &D1Database, id: &str, payload: &SectionTemplatePayload) -> Result<bool> {
    let statement = db.prepare(
        "INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, COALESCE(?8, 0))
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            schema_json = excluded.schema_json,
            template_html = excluded.template_html,
            template_css = excluded.template_css,
            css_classes_json = excluded.css_classes_json,
            is_locked = CASE WHEN ?8 IS NOT NULL THEN excluded.is_locked ELSE section_templates.is_locked END,
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
    let statement = db.prepare("DELETE FROM section_templates WHERE id = ?1");
    let result = statement.bind(&[id.into()])?.run().await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn create_revision(db: &D1Database, revision: &SectionTemplateRevision) -> Result<()> {
    let statement = db.prepare(
        "INSERT INTO section_template_revisions 
         (id, section_template_id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
    );
    let locked_js = if revision.is_locked {
        worker::wasm_bindgen::JsValue::from(1)
    } else {
        worker::wasm_bindgen::JsValue::from(0)
    };
    statement.bind(&[
        revision.id.as_str().into(),
        revision.section_template_id.as_str().into(),
        revision.name.as_str().into(),
        opt_js(&revision.description),
        revision.schema_json.as_str().into(),
        opt_js(&revision.template_html),
        opt_js(&revision.template_css),
        revision.css_classes_json.as_str().into(),
        locked_js,
    ])?.run().await?;
    Ok(())
}

pub async fn prune_revisions(db: &D1Database, section_template_id: &str, keep_count: usize) -> Result<()> {
    let statement = db.prepare(
        "DELETE FROM section_template_revisions 
         WHERE section_template_id = ?1 
         AND id NOT IN (
             SELECT id FROM section_template_revisions 
             WHERE section_template_id = ?1 
             ORDER BY created_at DESC 
             LIMIT ?2
         )"
    );
    statement.bind(&[
        section_template_id.into(),
        worker::wasm_bindgen::JsValue::from(keep_count as i32),
    ])?.run().await?;
    Ok(())
}

pub async fn get_revisions_list(db: &D1Database, section_template_id: &str) -> Result<Vec<SectionTemplateRevisionListItem>> {
    let statement = db.prepare(
        "SELECT id, section_template_id, name, created_at 
         FROM section_template_revisions 
         WHERE section_template_id = ?1 
         ORDER BY created_at DESC"
    );
    let result = statement.bind(&[section_template_id.into()])?.run().await?;
    result.results::<SectionTemplateRevisionListItem>()
}

pub async fn get_revision(db: &D1Database, id: &str) -> Result<Option<SectionTemplateRevision>> {
    let statement = db.prepare(
        "SELECT id, section_template_id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked, created_at 
         FROM section_template_revisions 
         WHERE id = ?1"
    );
    statement.bind(&[id.into()])?.first::<SectionTemplateRevision>(None).await
}
