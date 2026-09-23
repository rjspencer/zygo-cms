use crate::models::{Entry, EntryRevision};
use askama::Template;

#[derive(Template)]
#[template(path = "admin_dashboard.html")]
pub struct AdminDashboardTemplate<'a> {
    pub entries: &'a [Entry],
    pub deleted_entries: &'a [Entry],
    pub auth_url: &'a str,
    pub header_menu: &'a [crate::models::MenuItem],
    pub footer_menu: &'a [crate::models::MenuItem],
    pub analytics_enabled: bool,
}

pub fn render_dashboard_html(
    entries: &[Entry],
    deleted_entries: &[Entry],
    auth_url: &str,
    header_menu: &[crate::models::MenuItem],
    footer_menu: &[crate::models::MenuItem],
    analytics_enabled: bool,
) -> worker::Result<String> {
    AdminDashboardTemplate {
        entries,
        deleted_entries,
        auth_url,
        header_menu,
        footer_menu,
        analytics_enabled,
    }
    .render()
    .map_err(|e| worker::Error::RustError(e.to_string()))
}

#[derive(Template)]
#[template(path = "editor.html")]
pub struct EditorTemplate<'a> {
    pub entry: Option<&'a Entry>,
    pub latest_revision: Option<&'a EntryRevision>,
    pub pages: &'a [Entry],
    pub child_pages: &'a [Entry],
    pub auth_url: &'a str,
    pub header_menu: &'a [crate::models::MenuItem],
    pub footer_menu: &'a [crate::models::MenuItem],
    pub analytics_enabled: bool,
}

impl<'a> EditorTemplate<'a> {
    pub fn is_deleted(&self) -> bool {
        self.entry.map(|e| e.is_deleted()).unwrap_or(false)
    }

    pub fn deleted_at(&self) -> &str {
        self.entry
            .and_then(|e| e.deleted_at.as_deref())
            .unwrap_or_default()
    }

    pub fn has_children(&self) -> bool {
        !self.child_pages.is_empty()
    }

    pub fn child_count(&self) -> usize {
        self.child_pages.len()
    }

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

    pub fn entry_type(&self) -> &str {
        self.entry.map(|e| e.r#type.as_str()).unwrap_or("post")
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

    pub fn latest_preview_token(&self) -> &str {
        self.latest_revision
            .map(|r| r.preview_token.as_str())
            .unwrap_or_default()
    }

    pub fn has_preview(&self) -> bool {
        self.latest_revision.is_some()
    }

    pub fn title(&self) -> &str {
        self.latest_revision
            .map(|r| r.title.as_str())
            .or_else(|| self.entry.map(|p| p.title.as_str()))
            .unwrap_or_default()
    }

    pub fn slug(&self) -> &str {
        self.entry.map(|p| p.slug.as_str()).unwrap_or_default()
    }

    pub fn description(&self) -> &str {
        self.latest_revision
            .and_then(|r| r.description.as_deref())
            .or_else(|| self.entry.and_then(|p| p.description.as_deref()))
            .unwrap_or_default()
    }

    pub fn cover_image(&self) -> &str {
        self.latest_revision
            .and_then(|r| r.cover_image.as_deref())
            .or_else(|| self.entry.and_then(|p| p.cover_image.as_deref()))
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
        self.latest_revision
            .and_then(|r| r.category.as_deref())
            .or_else(|| self.entry.and_then(|p| p.category.as_deref()))
            .unwrap_or_default()
    }

    pub fn tags(&self) -> &str {
        self.latest_revision
            .and_then(|r| r.tags.as_deref())
            .or_else(|| self.entry.and_then(|p| p.tags.as_deref()))
            .unwrap_or_default()
    }

    pub fn is_published(&self) -> bool {
        self.entry
            .map(|p| p.status.as_str() == "published")
            .unwrap_or(true)
    }

    pub fn initial_json(&self) -> &str {
        self.latest_revision
            .map(|r| r.body_json.as_str())
            .filter(|s| !s.is_empty())
            .or_else(|| {
                self.entry
                    .map(|p| p.body_json.as_str())
                    .filter(|s| !s.is_empty())
            })
            .unwrap_or(r#"{"type":"doc","content":[{"type":"paragraph"}]}"#)
    }
}

pub fn render_editor_html(
    entry: Option<&Entry>,
    latest_revision: Option<&EntryRevision>,
    pages: &[Entry],
    child_pages: &[Entry],
    auth_url: &str,
    header_menu: &[crate::models::MenuItem],
    footer_menu: &[crate::models::MenuItem],
    analytics_enabled: bool,
) -> worker::Result<String> {
    EditorTemplate {
        entry,
        latest_revision,
        pages,
        child_pages,
        auth_url,
        header_menu,
        footer_menu,
        analytics_enabled,
    }
    .render()
    .map_err(|e| worker::Error::RustError(e.to_string()))
}

#[derive(Template)]
#[template(path = "admin_navigation.html")]
pub struct AdminNavigationTemplate<'a> {
    pub auth_url: &'a str,
    pub header_menu: &'a [crate::models::MenuItem],
    pub footer_menu: &'a [crate::models::MenuItem],
    pub analytics_enabled: bool,
}

pub fn render_navigation_html(
    auth_url: &str,
    header_menu: &[crate::models::MenuItem],
    footer_menu: &[crate::models::MenuItem],
    analytics_enabled: bool,
) -> worker::Result<String> {
    AdminNavigationTemplate { auth_url, header_menu, footer_menu, analytics_enabled }
        .render()
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

#[derive(Template)]
#[template(path = "admin_content_types.html")]
struct AdminContentTypesTemplate<'a> {
    auth_url: &'a str,
    header_menu: &'a [crate::models::MenuItem],
    footer_menu: &'a [crate::models::MenuItem],
    analytics_enabled: bool,
}

pub fn render_content_types_html(
    auth_url: &str,
    header_menu: &[crate::models::MenuItem],
    footer_menu: &[crate::models::MenuItem],
    analytics_enabled: bool,
) -> worker::Result<String> {
    AdminContentTypesTemplate { auth_url, header_menu, footer_menu, analytics_enabled }
        .render()
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

impl<'a> EditorTemplate<'a> {
    pub fn custom_fields_json(&self) -> String {
        self.latest_revision
            .and_then(|r| r.custom_fields_json.clone())
            .or_else(|| self.entry.and_then(|p| p.custom_fields_json.clone()))
            .unwrap_or_else(|| "{}".to_string())
    }
}

#[derive(Template)]
#[template(path = "admin_analytics.html")]
pub struct AdminAnalyticsTemplate<'a> {
    pub analytics_enabled: bool,
    pub has_cloudflare_tokens: bool,
    pub auth_url: &'a str,
    pub header_menu: &'a [crate::models::MenuItem],
    pub footer_menu: &'a [crate::models::MenuItem],
}

pub fn render_analytics_html(
    analytics_enabled: bool,
    has_cloudflare_tokens: bool,
    auth_url: &str,
    header_menu: &[crate::models::MenuItem],
    footer_menu: &[crate::models::MenuItem],
) -> worker::Result<String> {
    AdminAnalyticsTemplate {
        analytics_enabled,
        has_cloudflare_tokens,
        auth_url,
        header_menu,
        footer_menu,
    }
    .render()
    .map_err(|e| worker::Error::RustError(e.to_string()))
}
