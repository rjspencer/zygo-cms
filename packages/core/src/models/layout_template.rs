use serde::{Deserialize, Serialize};
use std::hash::{DefaultHasher, Hasher};

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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct LayoutTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub template_html: String,
    pub template_css: String,
    #[serde(deserialize_with = "deserialize_bool_lenient")]
    pub is_locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for LayoutTemplate {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: None,
            template_html: String::new(),
            template_css: String::new(),
            is_locked: false,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

impl LayoutTemplate {
    pub fn default_seed(id: &str) -> Option<LayoutTemplatePayload> {
        super::layout_defaults::get_default_layout_template(id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct LayoutTemplateRevision {
    pub id: String,
    pub layout_template_id: String,
    pub template_html: String,
    pub template_css: String,
    pub created_at: String,
}

impl Default for LayoutTemplateRevision {
    fn default() -> Self {
        Self {
            id: String::new(),
            layout_template_id: String::new(),
            template_html: String::new(),
            template_css: String::new(),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct LayoutTemplatePayload {
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_html: Option<String>,
    pub template_css: Option<String>,
    pub is_locked: Option<bool>,
}

/// Computes an 8-character deterministic hex hash from stylesheet inputs.
/// Used to dynamically cache-bust public styles (e.g., `/style-53uh3t.css`).
pub fn compute_styles_hash(css_parts: &[&str]) -> String {
    let mut hasher = DefaultHasher::new();
    for part in css_parts {
        hasher.write(part.as_bytes());
    }
    let val = hasher.finish();
    format!("{:08x}", (val & 0xFFFFFFFF))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layout_template_defaults() {
        let t = LayoutTemplate::default();
        assert_eq!(t.id, "");
        assert_eq!(t.is_locked, false);
        assert_eq!(t.template_css, "");
    }

    #[test]
    fn test_compute_styles_hash_deterministic() {
        let h1 = compute_styles_hash(&["body { color: red; }", "a { text-decoration: none; }"]);
        let h2 = compute_styles_hash(&["body { color: red; }", "a { text-decoration: none; }"]);
        let h3 = compute_styles_hash(&["body { color: blue; }"]);

        assert_eq!(h1, h2);
        assert_ne!(h1, h3);
        assert_eq!(h1.len(), 8);
    }

    #[test]
    fn test_layout_template_deserialize_sqlite_bool() {
        let json_data = r#"{
            "id": "post",
            "name": "Post Template",
            "template_html": "<article>{{ post.title }}</article>",
            "template_css": ".post { margin: 0; }",
            "is_locked": 1,
            "created_at": "2026-10-14 10:00:00",
            "updated_at": "2026-10-14 10:00:00"
        }"#;

        let parsed: LayoutTemplate = serde_json::from_str(json_data).unwrap();
        assert_eq!(parsed.id, "post");
        assert!(parsed.is_locked);
    }
}
