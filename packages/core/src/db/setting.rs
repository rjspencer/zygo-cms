use crate::models::Setting;
use worker::D1Database;

pub async fn get_setting(db: &D1Database, key: &str) -> worker::Result<Option<Setting>> {
    let stmt = db.prepare("SELECT * FROM settings WHERE key = ?1").bind(&[key.into()])?;
    stmt.first::<Setting>(None).await
}

pub async fn set_setting(db: &D1Database, key: &str, value: &str) -> worker::Result<()> {
    let stmt = db.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP"
    ).bind(&[key.into(), value.into()])?;
    
    stmt.run().await?;
    Ok(())
}
