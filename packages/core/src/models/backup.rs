use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use super::{LayoutTemplate, SectionTemplate};

fn default_version() -> String {
    "1.0".to_string()
}

fn default_entry_type() -> String {
    "post".to_string()
}

fn default_status() -> String {
    "published".to_string()
}

fn default_redirect_status() -> i32 {
    301
}

pub fn deserialize_settings_lenient<'de, D>(
    deserializer: D,
) -> std::result::Result<HashMap<String, String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let val = serde_json::Value::deserialize(deserializer)?;
    let mut map = HashMap::new();
    match val {
        serde_json::Value::Object(obj) => {
            for (k, v) in obj {
                let str_val = match v {
                    serde_json::Value::String(s) => s,
                    serde_json::Value::Null => String::new(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Number(n) => n.to_string(),
                    other => other.to_string(),
                };
                map.insert(k, str_val);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                if let serde_json::Value::Object(item_obj) = item {
                    if let (Some(k), Some(v)) = (item_obj.get("key"), item_obj.get("value")) {
                        let k_str = match k {
                            serde_json::Value::String(s) => s.clone(),
                            other => other.to_string(),
                        };
                        let v_str = match v {
                            serde_json::Value::String(s) => s.clone(),
                            serde_json::Value::Null => String::new(),
                            serde_json::Value::Bool(b) => b.to_string(),
                            serde_json::Value::Number(n) => n.to_string(),
                            other => other.to_string(),
                        };
                        map.insert(k_str, v_str);
                    }
                }
            }
        }
        _ => {}
    }
    Ok(map)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BackupMenu {
    #[serde(default)]
    pub id: Option<i64>,
    pub name: String,
    pub items_json: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BackupEntry {
    #[serde(default)]
    pub id: Option<i64>,
    pub slug: String,
    pub title: String,
    #[serde(default = "default_entry_type")]
    pub r#type: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub cover_image: Option<String>,
    #[serde(default)]
    pub canonical_url: Option<String>,
    #[serde(default)]
    pub schema_json: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub body_html: String,
    #[serde(default)]
    pub body_json: String,
    #[serde(default)]
    pub custom_fields_json: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub parent_id: Option<i64>,
    #[serde(default)]
    pub parent_slug: Option<String>,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    pub deleted_at: Option<String>,
    #[serde(default)]
    pub author_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BackupRedirect {
    #[serde(default)]
    pub id: Option<i64>,
    pub source_path: String,
    pub target_url: String,
    #[serde(default = "default_redirect_status")]
    pub status_code: i32,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub hit_count: Option<i64>,
    #[serde(default)]
    pub is_active: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BackupMediaItem {
    #[serde(default)]
    pub id: Option<i64>,
    pub key: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZygoBackupPayload {
    #[serde(default = "default_version")]
    pub version: String,
    pub exported_at: String,
    #[serde(deserialize_with = "deserialize_settings_lenient")]
    pub settings: HashMap<String, String>,
    #[serde(default)]
    pub menus: Vec<BackupMenu>,
    #[serde(default)]
    pub section_templates: Vec<SectionTemplate>,
    #[serde(default)]
    pub layout_templates: Vec<LayoutTemplate>,
    #[serde(default)]
    pub entries: Vec<BackupEntry>,
    #[serde(default)]
    pub redirects: Vec<BackupRedirect>,
    #[serde(default)]
    pub media_manifest: Vec<BackupMediaItem>,
}

impl Default for ZygoBackupPayload {
    fn default() -> Self {
        Self {
            version: default_version(),
            exported_at: String::new(),
            settings: HashMap::new(),
            menus: Vec::new(),
            section_templates: Vec::new(),
            layout_templates: Vec::new(),
            entries: Vec::new(),
            redirects: Vec::new(),
            media_manifest: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImportBackupRequest {
    #[serde(default)]
    pub backup: Option<ZygoBackupPayload>,
    #[serde(default)]
    pub dry_run: Option<bool>,
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ImportCounts {
    pub settings: usize,
    pub menus: usize,
    pub section_templates: usize,
    pub layout_templates: usize,
    pub entries: usize,
    pub redirects: usize,
    #[serde(default)]
    pub media: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportBackupResponse {
    pub success: bool,
    pub dry_run: bool,
    pub counts: ImportCounts,
    pub warnings: Vec<String>,
}

/// Validates all section and layout templates within a backup payload
pub fn validate_backup_payload(payload: &ZygoBackupPayload) -> Result<Vec<String>, String> {
    let mut warnings = Vec::new();

    // 1. Validate section templates with MiniJinja and schema validation
    for template in &payload.section_templates {
        if let Some(ref html) = template.template_html {
            let res = crate::template_validation::validate_template(html, &template.schema_json);
            if !res.is_valid {
                return Err(format!(
                    "Section template '{}' validation failed: {}",
                    template.id,
                    res.errors.join("; ")
                ));
            }
            for w in res.warnings {
                warnings.push(format!("Section template '{}': {}", template.id, w));
            }
        }
    }

    // 2. Validate layout templates MiniJinja syntax
    for layout in &payload.layout_templates {
        if !layout.template_html.trim().is_empty() {
            if let Err(e) = minijinja::machinery::parse(
                &layout.template_html,
                &layout.id,
                Default::default(),
                Default::default(),
            ) {
                return Err(format!(
                    "Layout template '{}' MiniJinja syntax error: {}",
                    layout.id, e
                ));
            }
        }
    }

    // 3. Basic validation of entries
    for entry in &payload.entries {
        if entry.slug.trim().is_empty() {
            return Err("Entry validation failed: slug cannot be empty".to_string());
        }
        if entry.title.trim().is_empty() {
            return Err(format!("Entry '{}' validation failed: title cannot be empty", entry.slug));
        }
    }

    // 4. Basic validation of redirects
    for redirect in &payload.redirects {
        if redirect.source_path.trim().is_empty() {
            return Err("Redirect validation failed: source_path cannot be empty".to_string());
        }
        if redirect.target_url.trim().is_empty() {
            return Err(format!(
                "Redirect '{}' validation failed: target_url cannot be empty",
                redirect.source_path
            ));
        }
    }

    Ok(warnings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_payload_serialization_roundtrip() {
        let mut settings = HashMap::new();
        settings.insert("site_title".to_string(), "Zygo Test".to_string());

        let payload = ZygoBackupPayload {
            version: "1.0".to_string(),
            exported_at: "2026-10-23T22:00:00Z".to_string(),
            settings,
            menus: vec![BackupMenu {
                id: Some(1),
                name: "header".to_string(),
                items_json: "[]".to_string(),
                created_at: None,
                updated_at: None,
            }],
            section_templates: vec![],
            layout_templates: vec![],
            entries: vec![BackupEntry {
                id: Some(10),
                slug: "hello-world".to_string(),
                title: "Hello World".to_string(),
                r#type: "post".to_string(),
                status: "published".to_string(),
                description: None,
                cover_image: None,
                canonical_url: None,
                schema_json: None,
                category: None,
                tags: None,
                published_at: None,
                body_html: "<p>Hello</p>".to_string(),
                body_json: "{}".to_string(),
                custom_fields_json: None,
                created_at: None,
                parent_id: None,
                parent_slug: None,
                path: Some("/post/hello-world".to_string()),
                sort_order: Some(0),
                deleted_at: None,
                author_id: None,
            }],
            redirects: vec![BackupRedirect {
                id: Some(1),
                source_path: "/old".to_string(),
                target_url: "/new".to_string(),
                status_code: 301,
                notes: None,
                hit_count: Some(0),
                is_active: Some(true),
                created_at: None,
                updated_at: None,
            }],
            media_manifest: vec![BackupMediaItem {
                id: Some(1),
                key: "test.webp".to_string(),
                filename: "test.webp".to_string(),
                mime_type: "image/webp".to_string(),
                size_bytes: 1024,
                url: Some("/media/test.webp".to_string()),
                created_at: None,
            }],
        };

        let json = serde_json::to_string(&payload).unwrap();
        let deserialized: ZygoBackupPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.version, "1.0");
        assert_eq!(deserialized.settings.get("site_title").unwrap(), "Zygo Test");
        assert_eq!(deserialized.entries.len(), 1);
        assert_eq!(deserialized.redirects.len(), 1);
        assert_eq!(deserialized.media_manifest.len(), 1);
    }

    #[test]
    fn test_deserialize_settings_object_and_array_formats() {
        let json_obj = r#"{
            "version": "1.0",
            "exported_at": "2026-10-23T00:00:00Z",
            "settings": {
                "site_title": "Site A",
                "posts_per_page": 10,
                "enable_search": true
            }
        }"#;

        let parsed: ZygoBackupPayload = serde_json::from_str(json_obj).unwrap();
        assert_eq!(parsed.settings.get("site_title").unwrap(), "Site A");
        assert_eq!(parsed.settings.get("posts_per_page").unwrap(), "10");
        assert_eq!(parsed.settings.get("enable_search").unwrap(), "true");

        let json_arr = r#"{
            "version": "1.0",
            "exported_at": "2026-10-23T00:00:00Z",
            "settings": [
                { "key": "theme", "value": "editorial" },
                { "key": "limit", "value": 5 }
            ]
        }"#;

        let parsed_arr: ZygoBackupPayload = serde_json::from_str(json_arr).unwrap();
        assert_eq!(parsed_arr.settings.get("theme").unwrap(), "editorial");
        assert_eq!(parsed_arr.settings.get("limit").unwrap(), "5");
    }

    #[test]
    fn test_validate_backup_payload_valid_and_invalid_templates() {
        let valid_payload = ZygoBackupPayload {
            layout_templates: vec![LayoutTemplate {
                id: "posts".to_string(),
                name: "Posts".to_string(),
                template_html: "<div>{{ title }}</div>".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        let res = validate_backup_payload(&valid_payload);
        assert!(res.is_ok());

        let invalid_payload = ZygoBackupPayload {
            layout_templates: vec![LayoutTemplate {
                id: "posts".to_string(),
                name: "Posts".to_string(),
                template_html: "<div>{% if foo }missing endif{% endif %}</div>".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        let res_err = validate_backup_payload(&invalid_payload);
        assert!(res_err.is_err());
        assert!(res_err.unwrap_err().contains("MiniJinja syntax error"));
    }
}
