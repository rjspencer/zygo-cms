use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[allow(dead_code)]
pub struct ContentTypeField {
    pub name: String,
    pub r#type: String, // "text", "number", "boolean", "date", etc.
    pub label: String,
    pub required: bool,
}

impl Default for ContentTypeField {
    fn default() -> Self {
        Self {
            name: String::new(),
            r#type: "text".to_string(),
            label: String::new(),
            required: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ContentType {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    // JSON string representing an array of ContentTypeField
    pub schema_json: String, 
    pub created_at: String,
    pub updated_at: String,
    pub template_html: Option<String>,
    pub template_css: Option<String>,
    #[serde(deserialize_with = "deserialize_json_array_or_empty")]
    pub css_classes_json: String,
    #[serde(deserialize_with = "deserialize_bool_lenient")]
    pub is_locked: bool,
}

impl Default for ContentType {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: None,
            schema_json: "[]".to_string(),
            created_at: String::new(),
            updated_at: String::new(),
            template_html: None,
            template_css: None,
            css_classes_json: "[]".to_string(),
            is_locked: false,
        }
    }
}

fn deserialize_json_array_or_empty<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(opt.unwrap_or_else(|| "[]".to_string()))
}

fn deserialize_bool_lenient<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct BoolVisitor;

    impl<'de> serde::de::Visitor<'de> for BoolVisitor {
        type Value = bool;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a boolean, integer 0/1, or null")
        }

        fn visit_bool<E>(self, v: bool) -> std::result::Result<bool, E> {
            Ok(v)
        }

        fn visit_i64<E>(self, v: i64) -> std::result::Result<bool, E> {
            Ok(v != 0)
        }

        fn visit_u64<E>(self, v: u64) -> std::result::Result<bool, E> {
            Ok(v != 0)
        }

        fn visit_f64<E>(self, v: f64) -> std::result::Result<bool, E> {
            Ok(v != 0.0)
        }

        fn visit_none<E>(self) -> std::result::Result<bool, E> {
            Ok(false)
        }

        fn visit_unit<E>(self) -> std::result::Result<bool, E> {
            Ok(false)
        }
    }

    deserializer.deserialize_any(BoolVisitor)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ContentTypePayload {
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,
    pub template_html: Option<String>,
    pub template_css: Option<String>,
    pub css_classes_json: Option<String>,
    pub is_locked: Option<bool>,
}

impl Default for ContentTypePayload {
    fn default() -> Self {
        Self {
            name: String::new(),
            description: None,
            schema_json: "[]".to_string(),
            template_html: None,
            template_css: None,
            css_classes_json: None,
            is_locked: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_type_defaults_and_unknown_fields() {
        let json = r#"{"id": "post", "name": "Post", "unknown_field": 123}"#;
        let ct: ContentType = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(ct.id, "post");
        assert_eq!(ct.name, "Post");
        assert_eq!(ct.description, None);
        assert_eq!(ct.schema_json, "[]");
        assert_eq!(ct.template_html, None);
        assert_eq!(ct.template_css, None);
        assert_eq!(ct.css_classes_json, "[]");
        assert_eq!(ct.is_locked, false);
    }

    #[test]
    fn test_content_type_sqlite_integer_bool() {
        let json = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": 1}"#;
        let ct: ContentType = serde_json::from_str(json).expect("should deserialize integer 1");
        assert!(ct.is_locked);

        let json0 = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": 0}"#;
        let ct0: ContentType = serde_json::from_str(json0).expect("should deserialize integer 0");
        assert!(!ct0.is_locked);

        let json_bool = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": true}"#;
        let ct_bool: ContentType = serde_json::from_str(json_bool).expect("should deserialize boolean true");
        assert!(ct_bool.is_locked);
    }

    #[test]
    fn test_content_type_null_css_classes() {
        let json = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "css_classes_json": null}"#;
        let ct: ContentType = serde_json::from_str(json).expect("should deserialize null css_classes_json");
        assert_eq!(ct.css_classes_json, "[]");
    }

    #[test]
    fn test_content_type_full() {
        let json = r#"{
            "id": "hero",
            "name": "Hero Section",
            "description": "Hero section",
            "schema_json": "[{\"name\":\"headline\",\"type\":\"text\",\"label\":\"Headline\",\"required\":true}]",
            "created_at": "2026-10-04 00:00:00",
            "updated_at": "2026-10-04 00:00:00",
            "template_html": "<section>{{ headline }}</section>",
            "template_css": ".hero { color: red; }",
            "css_classes_json": "[\"hero\", \"full-width\"]",
            "is_locked": true
        }"#;
        let ct: ContentType = serde_json::from_str(json).expect("should deserialize full struct");
        assert_eq!(ct.id, "hero");
        assert_eq!(ct.template_html.as_deref(), Some("<section>{{ headline }}</section>"));
        assert_eq!(ct.template_css.as_deref(), Some(".hero { color: red; }"));
        assert_eq!(ct.css_classes_json, "[\"hero\", \"full-width\"]");
        assert!(ct.is_locked);
    }

    #[test]
    fn test_content_type_payload_defaults() {
        let json = r#"{"name": "Custom"}"#;
        let payload: ContentTypePayload = serde_json::from_str(json).expect("should deserialize payload defaults");
        assert_eq!(payload.name, "Custom");
        assert_eq!(payload.description, None);
        assert_eq!(payload.schema_json, "[]");
        assert_eq!(payload.template_html, None);
        assert_eq!(payload.template_css, None);
        assert_eq!(payload.css_classes_json, None);
    }

    #[test]
    fn test_content_type_payload_full() {
        let json = r#"{
            "name": "Hero",
            "description": "Hero section",
            "schema_json": "[]",
            "template_html": "<div>Hero</div>",
            "template_css": ".hero { color: red; }",
            "css_classes_json": "[\"hero\"]"
        }"#;
        let payload: ContentTypePayload = serde_json::from_str(json).expect("should deserialize payload full");
        assert_eq!(payload.name, "Hero");
        assert_eq!(payload.template_html.as_deref(), Some("<div>Hero</div>"));
        assert_eq!(payload.template_css.as_deref(), Some(".hero { color: red; }"));
        assert_eq!(payload.css_classes_json.as_deref(), Some("[\"hero\"]"));
    }
}

