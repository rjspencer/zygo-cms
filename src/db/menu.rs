use crate::models::Menu;
use worker::{D1Database, Result};
use std::collections::HashMap;

pub async fn get_all_menus(db: &D1Database) -> Result<HashMap<String, Menu>> {
    let statement = db.prepare("SELECT id, name, items_json, created_at, updated_at FROM menus");
    let result = statement.all().await?;
    
    let results = result.results::<Menu>()?;
    let mut map: HashMap<_, _> = results.into_iter().map(|m| (m.name.clone(), m)).collect();
    
    // Ensure header and footer exist in the map as fallbacks if missing
    if !map.contains_key("header") {
        map.insert("header".into(), Menu {
            id: 0,
            name: "header".into(),
            items_json: "[]".into(),
            created_at: "".into(),
            updated_at: "".into(),
        });
    }
    if !map.contains_key("footer") {
        map.insert("footer".into(), Menu {
            id: 0,
            name: "footer".into(),
            items_json: "[]".into(),
            created_at: "".into(),
            updated_at: "".into(),
        });
    }

    Ok(map)
}

pub async fn get_menu_by_name(db: &D1Database, name: &str) -> Result<Option<Menu>> {
    let statement = db.prepare("SELECT id, name, items_json, created_at, updated_at FROM menus WHERE name = ?1");
    statement.bind(&[name.into()])?.first::<Menu>(None).await
}

pub async fn update_menu_items(db: &D1Database, name: &str, items_json: &str) -> Result<bool> {
    let result = db
        .prepare("INSERT INTO menus (name, items_json, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET items_json = ?2, updated_at = CURRENT_TIMESTAMP")
        .bind(&[name.into(), items_json.into()])?
        .run()
        .await?;
    Ok(result.success())
}
