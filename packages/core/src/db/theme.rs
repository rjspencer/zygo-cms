use crate::models::{Theme, ThemeRow};
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

const ALL_COLUMNS: &str = "id, name, description, tokens_json, is_locked, created_at, updated_at";

fn opt_str_js(val: Option<&str>) -> JsValue {
    match val {
        Some(s) => JsValue::from(s),
        None => JsValue::null(),
    }
}

pub async fn get_all(db: &D1Database) -> Result<Vec<Theme>> {
    let query = format!("SELECT {} FROM themes ORDER BY is_locked DESC, name ASC", ALL_COLUMNS);
    let statement = db.prepare(&query);
    let result = statement.run().await?;
    let rows = result.results::<ThemeRow>()?;
    Ok(rows.into_iter().map(Theme::from).collect())
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<Theme>> {
    let query = format!("SELECT {} FROM themes WHERE id = ?1", ALL_COLUMNS);
    let statement = db.prepare(&query);
    let row = statement.bind(&[id.into()])?.first::<ThemeRow>(None).await?;
    Ok(row.map(Theme::from))
}

pub async fn create(
    db: &D1Database,
    id: &str,
    name: &str,
    description: Option<&str>,
    tokens_json: &str,
    is_locked: bool,
) -> Result<bool> {
    let statement = db.prepare(
        "INSERT INTO themes (id, name, description, tokens_json, is_locked)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    );
    let locked_js = if is_locked {
        JsValue::from(1)
    } else {
        JsValue::from(0)
    };
    let result = statement
        .bind(&[
            id.into(),
            name.into(),
            opt_str_js(description),
            tokens_json.into(),
            locked_js,
        ])?
        .run()
        .await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn update(
    db: &D1Database,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
    tokens_json: Option<&str>,
) -> Result<bool> {
    let statement = db.prepare(
        "UPDATE themes SET
            name = CASE WHEN ?2 IS NOT NULL THEN ?2 ELSE name END,
            description = CASE WHEN ?3 IS NOT NULL THEN ?3 ELSE description END,
            tokens_json = CASE WHEN ?4 IS NOT NULL THEN ?4 ELSE tokens_json END,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1",
    );
    let result = statement
        .bind(&[
            id.into(),
            opt_str_js(name),
            opt_str_js(description),
            opt_str_js(tokens_json),
        ])?
        .run()
        .await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn rename(db: &D1Database, id: &str, new_name: &str) -> Result<bool> {
    let statement = db.prepare(
        "UPDATE themes SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
    );
    let result = statement.bind(&[new_name.into(), id.into()])?.run().await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}

pub async fn delete(db: &D1Database, id: &str) -> Result<bool> {
    let statement = db.prepare("DELETE FROM themes WHERE id = ?1");
    let result = statement.bind(&[id.into()])?.run().await?;
    let rows_affected = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(rows_affected > 0)
}
