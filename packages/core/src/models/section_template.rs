use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SectionTemplateField {
    pub name: String,
    pub r#type: String, // "text", "textarea", "richtext", "url", "boolean", "image", "select", "list"
    pub label: String,
    pub required: bool,
    #[serde(default)]
    pub options: Option<Vec<String>>,
    #[serde(default)]
    pub fields: Option<Vec<SectionTemplateField>>,
}

impl Default for SectionTemplateField {
    fn default() -> Self {
        Self {
            name: String::new(),
            r#type: "text".to_string(),
            label: String::new(),
            required: false,
            options: None,
            fields: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SectionTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    // JSON string representing an array of SectionTemplateField
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

impl Default for SectionTemplate {
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
pub struct SectionTemplatePayload {
    #[serde(default)]
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,
    pub template_html: Option<String>,
    pub template_css: Option<String>,
    pub css_classes_json: Option<String>,
    pub is_locked: Option<bool>,
    #[serde(default)]
    pub force: Option<bool>,
}

impl Default for SectionTemplatePayload {
    fn default() -> Self {
        Self {
            id: None,
            name: String::new(),
            description: None,
            schema_json: "[]".to_string(),
            template_html: None,
            template_css: None,
            css_classes_json: None,
            is_locked: None,
            force: None,
        }
    }
}

// Aliases for backwards compatibility
pub type ContentType = SectionTemplate;
pub type ContentTypePayload = SectionTemplatePayload;
pub type ContentTypeField = SectionTemplateField;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_section_template_defaults_and_unknown_fields() {
        let json = r#"{"id": "hero", "name": "Hero", "unknown_field": 123}"#;
        let st: SectionTemplate = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(st.id, "hero");
        assert_eq!(st.name, "Hero");
        assert_eq!(st.description, None);
        assert_eq!(st.schema_json, "[]");
        assert_eq!(st.template_html, None);
        assert_eq!(st.template_css, None);
        assert_eq!(st.css_classes_json, "[]");
        assert_eq!(st.is_locked, false);
    }

    #[test]
    fn test_section_template_sqlite_integer_bool() {
        let json = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": 1}"#;
        let st: SectionTemplate = serde_json::from_str(json).expect("should deserialize integer 1");
        assert!(st.is_locked);

        let json0 = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": 0}"#;
        let st0: SectionTemplate = serde_json::from_str(json0).expect("should deserialize integer 0");
        assert!(!st0.is_locked);

        let json_bool = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "is_locked": true}"#;
        let st_bool: SectionTemplate = serde_json::from_str(json_bool).expect("should deserialize boolean true");
        assert!(st_bool.is_locked);
    }

    #[test]
    fn test_section_template_null_css_classes() {
        let json = r#"{"id": "custom", "name": "Custom", "schema_json": "[]", "css_classes_json": null}"#;
        let st: SectionTemplate = serde_json::from_str(json).expect("should deserialize null css_classes_json");
        assert_eq!(st.css_classes_json, "[]");
    }

    #[test]
    fn test_section_template_full() {
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
        let st: SectionTemplate = serde_json::from_str(json).expect("should deserialize full struct");
        assert_eq!(st.id, "hero");
        assert_eq!(st.template_html.as_deref(), Some("<section>{{ headline }}</section>"));
        assert_eq!(st.template_css.as_deref(), Some(".hero { color: red; }"));
        assert_eq!(st.css_classes_json, "[\"hero\", \"full-width\"]");
        assert!(st.is_locked);
    }

    #[test]
    fn test_section_template_payload_defaults() {
        let json = r#"{"name": "Custom"}"#;
        let payload: SectionTemplatePayload = serde_json::from_str(json).expect("should deserialize payload defaults");
        assert_eq!(payload.name, "Custom");
        assert_eq!(payload.description, None);
        assert_eq!(payload.schema_json, "[]");
        assert_eq!(payload.template_html, None);
        assert_eq!(payload.template_css, None);
        assert_eq!(payload.css_classes_json, None);
    }

    #[test]
    fn test_section_template_payload_full() {
        let json = r#"{
            "name": "Hero",
            "description": "Hero section",
            "schema_json": "[]",
            "template_html": "<div>Hero</div>",
            "template_css": ".hero { color: red; }",
            "css_classes_json": "[\"hero\"]"
        }"#;
        let payload: SectionTemplatePayload = serde_json::from_str(json).expect("should deserialize payload full");
        assert_eq!(payload.name, "Hero");
        assert_eq!(payload.template_html.as_deref(), Some("<div>Hero</div>"));
        assert_eq!(payload.template_css.as_deref(), Some(".hero { color: red; }"));
        assert_eq!(payload.css_classes_json.as_deref(), Some("[\"hero\"]"));
    }
}
