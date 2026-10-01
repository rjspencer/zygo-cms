use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct User {
    pub id: i64,
    pub auth_provider_id: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub avatar_url: Option<String>,
}

impl Default for User {
    fn default() -> Self {
        Self {
            id: 0,
            auth_provider_id: String::new(),
            email: None,
            display_name: None,
            role: "author".to_string(),
            created_at: String::new(),
            updated_at: String::new(),
            deleted_at: None,
            bio: None,
            website: None,
            avatar_url: None,
        }
    }
}
