#!/bin/bash
cat << 'INNER_EOF' >> packages/core/src/models/section_template.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SectionTemplateRevision {
    pub id: String,
    pub section_template_id: String,
    pub name: String,
    pub description: Option<String>,
    pub schema_json: String,
    pub template_html: Option<String>,
    pub template_css: Option<String>,
    #[serde(deserialize_with = "deserialize_json_array_or_empty")]
    pub css_classes_json: String,
    #[serde(deserialize_with = "deserialize_bool_lenient")]
    pub is_locked: bool,
    pub created_at: String,
}

impl Default for SectionTemplateRevision {
    fn default() -> Self {
        Self {
            id: String::new(),
            section_template_id: String::new(),
            name: String::new(),
            description: None,
            schema_json: "[]".to_string(),
            template_html: None,
            template_css: None,
            css_classes_json: "[]".to_string(),
            is_locked: false,
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SectionTemplateRevisionListItem {
    pub id: String,
    pub section_template_id: String,
    pub name: String,
    pub created_at: String,
}

impl Default for SectionTemplateRevisionListItem {
    fn default() -> Self {
        Self {
            id: String::new(),
            section_template_id: String::new(),
            name: String::new(),
            created_at: String::new(),
        }
    }
}
INNER_EOF
