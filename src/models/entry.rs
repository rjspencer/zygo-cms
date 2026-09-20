use crate::error::AppError;
use serde::{Deserialize, Serialize};

pub const RESERVED_SLUGS: &[&str] = &[
    "admin",
    "api",
    "media",
    "post",
    "posts",
    "entries",
    "public",
    "style.css",
    "editor.css",
    "editor.js",
    "tag",
    "tags",
    "category",
    "categories",
];

fn default_type() -> String {
    "post".to_string()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BreadcrumbItem {
    pub title: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pagination {
    pub page: i64,
    pub per_page: i64,
    pub total_posts: i64,
    pub total_pages: i64,
    pub has_prev: bool,
    pub has_next: bool,
    pub prev_url: Option<String>,
    pub next_url: Option<String>,
}

impl Pagination {
    pub fn new(base_path: &str, requested_page: i64, per_page: i64, total_posts: i64) -> Self {
        let per_page = if per_page <= 0 { 10 } else { per_page };
        let total_pages = if total_posts <= 0 {
            1
        } else {
            (total_posts + per_page - 1) / per_page
        };
        let page = requested_page.max(1);
        let has_prev = page > 1;
        let has_next = page < total_pages;

        let prev_url = if has_prev {
            Some(Self::format_page_url(base_path, page - 1))
        } else {
            None
        };

        let next_url = if has_next {
            Some(Self::format_page_url(base_path, page + 1))
        } else {
            None
        };

        Self {
            page,
            per_page,
            total_posts,
            total_pages,
            has_prev,
            has_next,
            prev_url,
            next_url,
        }
    }

    pub fn format_page_url(base_path: &str, page_num: i64) -> String {
        let clean = if base_path == "/" {
            ""
        } else {
            base_path.trim_end_matches('/')
        };

        if page_num <= 1 {
            if clean.is_empty() {
                "/".to_string()
            } else {
                clean.to_string()
            }
        } else {
            if clean.is_empty() {
                format!("/?page={page_num}")
            } else {
                format!("{clean}?page={page_num}")
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub id: i64,
    pub slug: String,
    pub title: String,
    #[serde(default = "default_type")]
    pub r#type: String,
    pub status: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub canonical_url: Option<String>,
    pub schema_json: Option<String>,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub published_at: Option<String>,
    #[serde(default)]
    pub body_html: String,
    #[serde(default)]
    pub body_json: String,
    pub created_at: String,
    pub parent_id: Option<i64>,
    pub path: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

impl Entry {
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    pub fn tag_list(&self) -> Vec<&str> {
        self.tags
            .as_deref()
            .map(|t| t.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect())
            .unwrap_or_default()
    }

    pub fn display_date(&self) -> &str {
        let raw = self.published_at.as_deref().unwrap_or(&self.created_at);
        raw.split_whitespace().next().unwrap_or(raw)
    }

    pub fn entry_type(&self) -> &str {
        &self.r#type
    }

    pub fn path(&self) -> String {
        if let Some(ref p) = self.path {
            let trimmed = p.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        if self.r#type == "post" {
            format!("/post/{}", self.slug)
        } else {
            format!("/{}", self.slug)
        }
    }

    pub fn rfc3339_date(&self) -> String {
        let raw = self.published_at.as_deref().unwrap_or(&self.created_at);
        format!("{}Z", raw.replace(' ', "T"))
    }

    pub fn canonical(&self, origin: &str) -> String {
        if let Some(ref custom) = self.canonical_url {
            let trimmed = custom.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        format!("{}{}", origin.trim_end_matches('/'), self.path())
    }

    pub fn schema_json_ld(&self, origin: &str) -> String {
        if let Some(ref custom) = self.schema_json {
            let trimmed = custom.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }

        let canonical_url = self.canonical(origin);
        let date_published = self.rfc3339_date();
        let description = self.meta_description();
        let image = self.cover_image.as_deref();

        let mut val = serde_json::json!({
            "@context": "https://schema.org",
            "@type": if self.r#type == "post" { "BlogPosting" } else { "WebPage" },
            "headline": self.title,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonical_url
            },
            "datePublished": date_published,
            "dateModified": date_published,
        });

        if !description.is_empty() {
            val["description"] = serde_json::json!(description);
        }
        if let Some(img) = image {
            if !img.is_empty() {
                val["image"] = serde_json::json!(img);
            }
        }

        serde_json::to_string_pretty(&val).unwrap_or_else(|_| "{}".to_string())
    }

    /// Returns the custom SEO description if set, or an auto-generated excerpt from body_html (up to 160 chars).
    pub fn meta_description(&self) -> String {
        if let Some(ref custom) = self.description {
            let trimmed = custom.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        self.excerpt(160)
    }

    /// Strips HTML tags and collapses whitespace, truncating cleanly at a word boundary within max_chars.
    pub fn excerpt(&self, max_chars: usize) -> String {
        let mut clean = String::with_capacity(self.body_html.len());
        let mut in_tag = false;
        let mut tag_name = String::new();

        for c in self.body_html.chars() {
            match c {
                '<' => {
                    in_tag = true;
                    tag_name.clear();
                }
                '>' => {
                    in_tag = false;
                    let tag = tag_name.trim().to_ascii_lowercase();
                    let tag_clean = tag.strip_prefix('/').unwrap_or(&tag).trim_end_matches('/');
                    let tag_word = tag_clean.split_whitespace().next().unwrap_or("");
                    let is_block = matches!(
                        tag_word,
                        "p" | "br"
                            | "div"
                            | "li"
                            | "h1"
                            | "h2"
                            | "h3"
                            | "h4"
                            | "h5"
                            | "h6"
                            | "blockquote"
                            | "tr"
                            | "section"
                            | "article"
                            | "header"
                            | "footer"
                    );
                    if is_block && !clean.ends_with(' ') {
                        clean.push(' ');
                    }
                }
                _ if in_tag => {
                    tag_name.push(c);
                }
                _ => {
                    clean.push(c);
                }
            }
        }

        let clean = clean
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'");

        let words: Vec<&str> = clean.split_whitespace().collect();
        let full_text = words.join(" ");

        if full_text.chars().count() <= max_chars {
            if full_text.is_empty() {
                return self.title.clone();
            }
            return full_text;
        }

        let mut result = String::new();
        for word in words {
            let needed = if result.is_empty() {
                word.chars().count()
            } else {
                result.chars().count() + 1 + word.chars().count()
            };
            if needed + 3 > max_chars {
                break;
            }
            if !result.is_empty() {
                result.push(' ');
            }
            result.push_str(word);
        }

        if result.is_empty() {
            let prefix: String = full_text
                .chars()
                .take(max_chars.saturating_sub(3))
                .collect();
            format!("{}...", prefix)
        } else {
            format!("{}...", result)
        }
    }
}

fn deserialize_some_opt<'de, D, T>(deserializer: D) -> std::result::Result<Option<Option<T>>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
pub struct CreateEntryRequest {
    pub slug: String,
    pub title: String,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub canonical_url: Option<String>,
    pub schema_json: Option<String>,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub parent_id: Option<i64>,
    pub sort_order: Option<i32>,
    pub body_html: String,
    pub body_json: String,
}

impl CreateEntryRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.title.trim().is_empty() {
            return Err(AppError::BadRequest("Title cannot be empty".into()));
        }

        if self.slug.trim().is_empty() {
            return Err(AppError::BadRequest("Slug cannot be empty".into()));
        }

        let is_valid_slug = self
            .slug
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-');

        if !is_valid_slug {
            return Err(AppError::BadRequest(
                "Slug must contain only alphanumeric characters and hyphens".into(),
            ));
        }

        let slug_lower = self.slug.trim().to_ascii_lowercase();
        if RESERVED_SLUGS.contains(&slug_lower.as_str()) {
            return Err(AppError::BadRequest(format!(
                "Slug '{}' is reserved by the system",
                self.slug
            )));
        }

        if let Some(ref t) = self.r#type {
            if t != "post" && t != "page" {
                return Err(AppError::BadRequest(
                    "Type must be either 'post' or 'page'".into(),
                ));
            }
        }

        if self.parent_id.is_some() && self.r#type.as_deref() != Some("page") {
            return Err(AppError::BadRequest(
                "Only pages can have a parent page".into(),
            ));
        }

        if let Some(ref status) = self.status {
            if status != "draft" && status != "published" {
                return Err(AppError::BadRequest(
                    "Status must be either 'draft' or 'published'".into(),
                ));
            }
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntryRequest {
    pub title: Option<String>,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub canonical_url: Option<String>,
    pub schema_json: Option<String>,
    pub category: Option<String>,
    pub tags: Option<String>,
    #[serde(default, deserialize_with = "deserialize_some_opt")]
    pub parent_id: Option<Option<i64>>,
    pub sort_order: Option<i32>,
    pub body_html: Option<String>,
    pub body_json: Option<String>,
    pub draft_only: Option<bool>,
}

impl UpdateEntryRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        let has_any_field = self.title.is_some()
            || self.r#type.is_some()
            || self.status.is_some()
            || self.description.is_some()
            || self.cover_image.is_some()
            || self.canonical_url.is_some()
            || self.schema_json.is_some()
            || self.category.is_some()
            || self.tags.is_some()
            || self.parent_id.is_some()
            || self.sort_order.is_some()
            || self.body_html.is_some()
            || self.body_json.is_some();

        if !has_any_field {
            return Err(AppError::BadRequest(
                "Must provide at least one field to update".into(),
            ));
        }

        if let Some(ref title) = self.title {
            if title.trim().is_empty() {
                return Err(AppError::BadRequest("Title cannot be empty".into()));
            }
        }

        if let Some(ref t) = self.r#type {
            if t != "post" && t != "page" {
                return Err(AppError::BadRequest(
                    "Type must be either 'post' or 'page'".into(),
                ));
            }
        }

        if let Some(Some(_)) = self.parent_id {
            if let Some(ref t) = self.r#type {
                if t != "page" {
                    return Err(AppError::BadRequest(
                        "Only pages can have a parent page".into(),
                    ));
                }
            }
        }

        if let Some(ref status) = self.status {
            if status != "draft" && status != "published" {
                return Err(AppError::BadRequest(
                    "Status must be either 'draft' or 'published'".into(),
                ));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_create_entry() {
        let req = CreateEntryRequest {
            title: "--title--".into(),
            slug: "--slug--".into(),
            r#type: Some("post".into()),
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: Some("Tech".into()),
            tags: Some("rust, wasm".into()),
            parent_id: None,
            sort_order: None,
            body_html: "<p>body html</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_ok());
    }

    #[test]
    fn test_reserved_slug_fails() {
        let req = CreateEntryRequest {
            title: "Admin Panel".into(),
            slug: "admin".into(),
            r#type: Some("page".into()),
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: "<p>Hi</p>".into(),
            body_json: "{}".into(),
        };
        let result = req.validate();
        assert!(result.is_err());
        assert!(matches!(result, Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_reserved_taxonomy_slugs_fail() {
        for slug in &["tag", "tags", "category", "categories"] {
            let req = CreateEntryRequest {
                title: "Taxonomy Slug".into(),
                slug: (*slug).into(),
                r#type: Some("page".into()),
                status: Some("published".into()),
                description: None,
                cover_image: None,
                canonical_url: None,
                schema_json: None,
                category: None,
                tags: None,
                parent_id: None,
                sort_order: None,
                body_html: "<p>Hi</p>".into(),
                body_json: "{}".into(),
            };
            assert!(req.validate().is_err());
        }
    }

    #[test]
    fn test_invalid_type_fails() {
        let req = CreateEntryRequest {
            title: "Custom".into(),
            slug: "custom-slug".into(),
            r#type: Some("product".into()),
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: "<p>Hi</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_empty_title_fails() {
        let req = CreateEntryRequest {
            title: "   ".into(),
            slug: "valid-slug".into(),
            r#type: None,
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: "<p>Hello</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_empty_slug_fails() {
        let req = CreateEntryRequest {
            title: "Valid Title".into(),
            slug: "".into(),
            r#type: None,
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: "<p>Hello</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_invalid_slug_characters_fail() {
        let req = CreateEntryRequest {
            title: "Valid Title".into(),
            slug: "bad slug with spaces!".into(),
            r#type: None,
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: "<p>Hello</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_page_parent_id_validation() {
        let req_valid = CreateEntryRequest {
            title: "Subpage".into(),
            slug: "subpage".into(),
            r#type: Some("page".into()),
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: Some(1),
            sort_order: Some(2),
            body_html: "<p>Content</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req_valid.validate().is_ok());

        let req_invalid = CreateEntryRequest {
            title: "Subpost".into(),
            slug: "subpost".into(),
            r#type: Some("post".into()),
            status: Some("published".into()),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: Some(1),
            sort_order: None,
            body_html: "<p>Content</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req_invalid.validate().is_err());
    }

    #[test]
    fn test_empty_update_request_fails() {
        let req = UpdateEntryRequest {
            title: None,
            r#type: None,
            status: None,
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: None,
            body_json: None,
            draft_only: None,
        };
        assert!(req.validate().is_err());
    }

    #[test]
    fn test_valid_partial_update() {
        let req = UpdateEntryRequest {
            title: Some("New Title".into()),
            r#type: None,
            status: None,
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: None,
            sort_order: None,
            body_html: None,
            body_json: None,
            draft_only: None,
        };
        assert!(req.validate().is_ok());

        let req_tax = UpdateEntryRequest {
            title: None,
            r#type: None,
            status: None,
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: Some("Engineering".into()),
            tags: Some("rust, wasm".into()),
            parent_id: None,
            sort_order: None,
            body_html: None,
            body_json: None,
            draft_only: None,
        };
        assert!(req_tax.validate().is_ok());

        let req_hierarchy = UpdateEntryRequest {
            title: None,
            r#type: Some("page".into()),
            status: None,
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            parent_id: Some(Some(5)),
            sort_order: Some(10),
            body_html: None,
            body_json: None,
            draft_only: None,
        };
        assert!(req_hierarchy.validate().is_ok());
    }

    #[test]
    fn test_deserialize_update_request_parent_id() {
        let json_null: UpdateEntryRequest =
            serde_json::from_str(r#"{"parent_id": null}"#).unwrap();
        assert_eq!(json_null.parent_id, Some(None));

        let json_val: UpdateEntryRequest =
            serde_json::from_str(r#"{"parent_id": 42}"#).unwrap();
        assert_eq!(json_val.parent_id, Some(Some(42)));

        let json_omit: UpdateEntryRequest =
            serde_json::from_str(r#"{"title": "Only Title"}"#).unwrap();
        assert_eq!(json_omit.parent_id, None);
    }

    #[test]
    fn test_entry_path_resolution() {
        let mut entry = Entry {
            id: 1,
            slug: "team".into(),
            title: "Team".into(),
            r#type: "page".into(),
            status: "published".into(),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: None,
            body_html: "".into(),
            body_json: "".into(),
            created_at: "2026-01-01".into(),
            parent_id: Some(2),
            path: Some("/about/team".into()),
            sort_order: Some(0),
            deleted_at: None,
        };
        assert_eq!(entry.path(), "/about/team");

        entry.path = None;
        assert_eq!(entry.path(), "/team");

        entry.r#type = "post".into();
        assert_eq!(entry.path(), "/post/team");
    }

    #[test]
    fn test_tag_list() {
        let mut entry = Entry {
            id: 1,
            slug: "test".into(),
            title: "Test".into(),
            r#type: "post".into(),
            status: "published".into(),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: Some("General".into()),
            tags: Some("rust,  cloudflare , , wasm  ".into()),
            published_at: None,
            body_html: "<p>Hello</p>".into(),
            body_json: "{}".into(),
            created_at: "2026-01-01".into(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
        };
        assert_eq!(entry.tag_list(), vec!["rust", "cloudflare", "wasm"]);

        entry.tags = None;
        assert!(entry.tag_list().is_empty());
    }

    #[test]
    fn test_meta_description_custom() {
        let entry = Entry {
            id: 1,
            slug: "test".into(),
            title: "Test".into(),
            r#type: "post".into(),
            status: "published".into(),
            description: Some("Custom manual description".into()),
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: None,
            body_html: "<p>Some HTML content here.</p>".into(),
            body_json: "{}".into(),
            created_at: "2026-01-01".into(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
        };
        assert_eq!(entry.meta_description(), "Custom manual description");
    }

    #[test]
    fn test_meta_description_auto_from_html() {
        let entry = Entry {
            id: 1,
            slug: "test".into(),
            title: "Test".into(),
            r#type: "post".into(),
            status: "published".into(),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: None,
            body_html: "<p>Hello <strong>world</strong>! This is a post about <em>Rust</em>.</p>"
                .into(),
            body_json: "{}".into(),
            created_at: "2026-01-01".into(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
        };
        assert_eq!(
            entry.meta_description(),
            "Hello world! This is a post about Rust."
        );
    }

    #[test]
    fn test_entry_soft_delete() {
        let mut entry = Entry {
            id: 1,
            slug: "test".into(),
            title: "Test".into(),
            r#type: "post".into(),
            status: "published".into(),
            description: None,
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: None,
            body_html: "".into(),
            body_json: "".into(),
            created_at: "2026-01-01".into(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
        };
        assert!(!entry.is_deleted());

        entry.deleted_at = Some("2026-09-20 12:00:00".into());
        assert!(entry.is_deleted());
    }

    #[test]
    fn test_pagination_homepage_calculation() {
        // Page 1 of 3
        let p1 = Pagination::new("/", 1, 10, 25);
        assert_eq!(p1.page, 1);
        assert_eq!(p1.total_pages, 3);
        assert!(!p1.has_prev);
        assert!(p1.has_next);
        assert_eq!(p1.prev_url, None);
        assert_eq!(p1.next_url, Some("/?page=2".to_string()));

        // Page 2 of 3 (prev goes back to canonical root "/")
        let p2 = Pagination::new("/", 2, 10, 25);
        assert_eq!(p2.page, 2);
        assert!(p2.has_prev);
        assert!(p2.has_next);
        assert_eq!(p2.prev_url, Some("/".to_string()));
        assert_eq!(p2.next_url, Some("/?page=3".to_string()));

        // Page 3 of 3 (last page)
        let p3 = Pagination::new("/", 3, 10, 25);
        assert_eq!(p3.page, 3);
        assert!(p3.has_prev);
        assert!(!p3.has_next);
        assert_eq!(p3.prev_url, Some("/?page=2".to_string()));
        assert_eq!(p3.next_url, None);
    }

    #[test]
    fn test_pagination_tag_and_category_urls() {
        let tag_pag = Pagination::new("/tag/rust", 2, 5, 12);
        assert_eq!(tag_pag.page, 2);
        assert_eq!(tag_pag.total_pages, 3);
        assert_eq!(tag_pag.prev_url, Some("/tag/rust".to_string()));
        assert_eq!(tag_pag.next_url, Some("/tag/rust?page=3".to_string()));

        let cat_pag = Pagination::new("/category/tech", 1, 10, 15);
        assert_eq!(cat_pag.page, 1);
        assert_eq!(cat_pag.total_pages, 2);
        assert_eq!(cat_pag.prev_url, None);
        assert_eq!(cat_pag.next_url, Some("/category/tech?page=2".to_string()));
    }

    #[test]
    fn test_pagination_edge_cases() {
        // 0 total posts
        let zero = Pagination::new("/", 1, 10, 0);
        assert_eq!(zero.total_pages, 1);
        assert_eq!(zero.page, 1);
        assert!(!zero.has_prev);
        assert!(!zero.has_next);

        // Requested page beyond total_pages retains requested page with no next link
        let beyond = Pagination::new("/", 99, 10, 25);
        assert_eq!(beyond.page, 99);
        assert_eq!(beyond.total_pages, 3);
        assert!(beyond.has_prev);
        assert!(!beyond.has_next);

        // Negative requested page is normalized to 1
        let neg = Pagination::new("/", -5, 10, 25);
        assert_eq!(neg.page, 1);
    }
}

