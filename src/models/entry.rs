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
}

impl Entry {
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
    pub body_html: Option<String>,
    pub body_json: Option<String>,
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
            body_html: "<p>Hello</p>".into(),
            body_json: "{}".into(),
        };
        assert!(req.validate().is_err());
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
            body_html: None,
            body_json: None,
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
            body_html: None,
            body_json: None,
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
            body_html: None,
            body_json: None,
        };
        assert!(req_tax.validate().is_ok());
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
        };
        assert_eq!(
            entry.meta_description(),
            "Hello world! This is a post about Rust."
        );
    }
}
