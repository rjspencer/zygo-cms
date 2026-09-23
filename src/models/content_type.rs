use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentTypeField {
    pub name: String,
    pub r#type: String, // "text", "number", "boolean", "date", etc.
    pub label: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentType {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    // JSON string representing an array of ContentTypeField
    pub schema_json: String, 
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentTypePayload {
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,
}
