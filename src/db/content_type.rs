use super::opt_js;
use crate::models::{ContentType, ContentTypePayload};
use worker::wasm_bindgen::JsValue;
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
        "INSERT INTO content_types (id, name, description, schema_json)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            schema_json = excluded.schema_json,
            updated_at = CURRENT_TIMESTAMP"
    );
    let result = statement.bind(&[
        id.into(),
        payload.name.as_str().into(),
        opt_js(&payload.description),
        payload.schema_json.as_str().into()
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
