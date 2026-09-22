use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub auth_provider_id: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
}
