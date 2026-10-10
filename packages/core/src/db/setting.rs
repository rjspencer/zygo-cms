use crate::models::Setting;
use std::collections::HashMap;
use worker::D1Database;

pub async fn get_setting(db: &D1Database, key: &str) -> worker::Result<Option<Setting>> {
    let stmt = db
        .prepare("SELECT key, value, updated_at FROM settings WHERE key = ?1")
        .bind(&[key.into()])?;
    stmt.first::<Setting>(None).await
}

pub async fn set_setting(db: &D1Database, key: &str, value: &str) -> worker::Result<()> {
    let stmt = db
        .prepare(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[key.into(), value.into()])?;

    stmt.run().await?;
    Ok(())
}

pub async fn get_all_settings(db: &D1Database) -> worker::Result<Vec<Setting>> {
    let stmt = db.prepare("SELECT key, value, updated_at FROM settings");
    stmt.all().await.map(|r| r.results::<Setting>().unwrap_or_default())
}

pub async fn get_settings_map(db: &D1Database) -> worker::Result<HashMap<String, String>> {
    let list = get_all_settings(db).await?;
    let mut map = HashMap::new();
    for s in list {
        map.insert(s.key, s.value);
    }
    Ok(map)
}
