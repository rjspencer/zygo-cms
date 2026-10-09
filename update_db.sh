#!/bin/bash
sed -i '' 's/use crate::models::{SectionTemplate, SectionTemplatePayload};/use crate::models::{SectionTemplate, SectionTemplatePayload, SectionTemplateRevision, SectionTemplateRevisionListItem};/' packages/core/src/db/section_template.rs

cat << 'INNER_EOF' >> packages/core/src/db/section_template.rs

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
INNER_EOF
