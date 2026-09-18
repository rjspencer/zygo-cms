use crate::models::Entry;
use askama::Template;

#[derive(Template)]
#[template(path = "admin_dashboard.html")]
pub struct AdminDashboardTemplate<'a> {
    pub entries: &'a [Entry],
    pub auth_url: &'a str,
}

pub fn render_dashboard_html(entries: &[Entry], auth_url: &str) -> worker::Result<String> {
    AdminDashboardTemplate { entries, auth_url }
        .render()
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

#[derive(Template)]
#[template(path = "editor.html")]
pub struct EditorTemplate<'a> {
    pub entry: Option<&'a Entry>,
    pub pages: &'a [Entry],
    pub auth_url: &'a str,
}

impl<'a> EditorTemplate<'a> {
    pub fn action(&self) -> &'static str {
        if self.entry.is_some() {
            "Edit Entry"
        } else {
            "New Entry"
        }
    }

    pub fn post_id(&self) -> String {
        self.entry.map(|p| p.id.to_string()).unwrap_or_default()
    }

    pub fn is_page(&self) -> bool {
        self.entry
            .map(|e| e.r#type.as_str() == "page")
            .unwrap_or(false)
    }

    pub fn is_parent(&self, page_id: &i64) -> bool {
        self.entry
            .and_then(|e| e.parent_id)
            .map(|pid| pid == *page_id)
            .unwrap_or(false)
    }

    pub fn sort_order(&self) -> i32 {
        self.entry.and_then(|e| e.sort_order).unwrap_or(0)
    }

    pub fn can_be_parent(&self, page_id: &i64) -> bool {
        self.entry.map(|e| e.id != *page_id).unwrap_or(true)
    }

    pub fn title(&self) -> &str {
        self.entry.map(|p| p.title.as_str()).unwrap_or_default()
    }

    pub fn slug(&self) -> &str {
        self.entry.map(|p| p.slug.as_str()).unwrap_or_default()
    }

    pub fn description(&self) -> &str {
        self.entry
            .and_then(|p| p.description.as_deref())
            .unwrap_or_default()
    }

    pub fn cover_image(&self) -> &str {
        self.entry
            .and_then(|p| p.cover_image.as_deref())
            .unwrap_or_default()
    }

    pub fn canonical_url(&self) -> &str {
        self.entry
            .and_then(|p| p.canonical_url.as_deref())
            .unwrap_or_default()
    }

    pub fn schema_json(&self) -> &str {
        self.entry
            .and_then(|p| p.schema_json.as_deref())
            .unwrap_or_default()
    }

    pub fn category(&self) -> &str {
        self.entry
            .and_then(|p| p.category.as_deref())
            .unwrap_or_default()
    }

    pub fn tags(&self) -> &str {
        self.entry
            .and_then(|p| p.tags.as_deref())
            .unwrap_or_default()
    }

    pub fn is_published(&self) -> bool {
        self.entry
            .map(|p| p.status.as_str() == "published")
            .unwrap_or(true)
    }

    pub fn initial_json(&self) -> &str {
        self.entry
            .map(|p| p.body_json.as_str())
            .filter(|s| !s.is_empty())
            .unwrap_or(r#"{"type":"doc","content":[{"type":"paragraph"}]}"#)
    }
}

pub fn render_editor_html(
    entry: Option<&Entry>,
    pages: &[Entry],
    auth_url: &str,
) -> worker::Result<String> {
    EditorTemplate {
        entry,
        pages,
        auth_url,
    }
    .render()
    .map_err(|e| worker::Error::RustError(e.to_string()))
}
