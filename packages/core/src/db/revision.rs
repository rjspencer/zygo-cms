use super::opt_js;
use crate::models::{CreateRevisionParams, EntryRevision, EntryRevisionSummary};
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

const REVISION_SUMMARY_COLUMNS: &str =
    "id, entry_id, title, description, cover_image, category, tags, preview_token, created_at";
const REVISION_ALL_COLUMNS: &str = "id, entry_id, title, description, cover_image, body_html, body_json, custom_fields_json, category, tags, preview_token, created_at";

pub async fn create_revision(
    db: &D1Database,
    entry_id: i64,
    params: &CreateRevisionParams,
    preview_token: &str,
) -> Result<i64> {
    let statement = db.prepare(
        "INSERT INTO entry_revisions (
            entry_id, title, description, cover_image, body_html, body_json, custom_fields_json, category, tags, preview_token
         ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
         )",
    );

    let result = statement
        .bind(&[
            JsValue::from(entry_id as f64),
            params.title.as_str().into(),
            opt_js(&params.description),
            opt_js(&params.cover_image),
            params.body_html.as_str().into(),
            params.body_json.as_str().into(),
            opt_js(&params.custom_fields_json),
            opt_js(&params.category),
            opt_js(&params.tags),
            preview_token.into(),
        ])?
        .run()
        .await?;

    let rev_id = result.meta()?.and_then(|m| m.last_row_id).unwrap_or(0);

    Ok(rev_id)
}

pub async fn find_revisions_by_entry_id(
    db: &D1Database,
    entry_id: i64,
) -> Result<Vec<EntryRevisionSummary>> {
    let query = format!(
        "SELECT {REVISION_SUMMARY_COLUMNS} FROM entry_revisions WHERE entry_id = ?1 ORDER BY created_at DESC, id DESC"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[JsValue::from(entry_id as f64)])?
        .run()
        .await?;
    result.results::<EntryRevisionSummary>()
}

pub async fn find_revision_by_id(db: &D1Database, id: i64) -> Result<Option<EntryRevision>> {
    let query = format!("SELECT {REVISION_ALL_COLUMNS} FROM entry_revisions WHERE id = ?1");
    let statement = db.prepare(&query);
    statement
        .bind(&[JsValue::from(id as f64)])?
        .first::<EntryRevision>(None)
        .await
}

pub async fn find_revision_by_token(db: &D1Database, token: &str) -> Result<Option<EntryRevision>> {
    let query =
        format!("SELECT {REVISION_ALL_COLUMNS} FROM entry_revisions WHERE preview_token = ?1");
    let statement = db.prepare(&query);
    statement
        .bind(&[token.into()])?
        .first::<EntryRevision>(None)
        .await
}

pub async fn find_latest_revision_for_entry(
    db: &D1Database,
    entry_id: i64,
) -> Result<Option<EntryRevision>> {
    let query = format!(
        "SELECT {REVISION_ALL_COLUMNS} FROM entry_revisions WHERE entry_id = ?1 ORDER BY created_at DESC, id DESC LIMIT 1"
    );
    let statement = db.prepare(&query);
    statement
        .bind(&[JsValue::from(entry_id as f64)])?
        .first::<EntryRevision>(None)
        .await
}
