use crate::models::Entry;
use worker::{D1Database, Result};
use worker::wasm_bindgen::JsValue;

pub async fn search_entries(db: &D1Database, query: &str, limit: i64, entry_type: Option<&str>) -> Result<Vec<Entry>> {
    let mut q = String::from(
        r#"
        SELECT e.id, e.slug, e.title, e.type, e.status, e.description, e.cover_image, e.canonical_url, e.schema_json, e.category, e.tags, e.published_at, e.created_at, e.parent_id, e.path, e.sort_order, e.deleted_at, e.author_id, e.search_text 
        FROM search_index s
        JOIN entries e ON s.rowid = e.id
        WHERE search_index MATCH ?1
        AND e.status = 'published' AND e.deleted_at IS NULL
        "#
    );
    
    if entry_type.is_some() {
        q.push_str(" AND e.type = ?2");
    }
    
    q.push_str("\nORDER BY rank\nLIMIT ?3");

    let statement = db.prepare(&q);
    
    // Split the user query into words, wrap each in quotes, and join them with AND
    let words: Vec<&str> = query.split_whitespace()
        .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()))
        .filter(|w| !w.is_empty())
        .collect();
        
    let fts_query = words.iter()
        .map(|w| format!("\"{}\"", w.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" AND ");
        
    if fts_query.is_empty() { return Ok(vec![]); }
    
    let bound_type = entry_type.map(|t| JsValue::from(t)).unwrap_or(JsValue::null());
    
    let result = statement
        .bind(&[
            fts_query.into(),
            bound_type,
            JsValue::from(limit as f64)
        ])?
        .run()
        .await?;
        
    result.results::<Entry>()
}
