use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MediaItem {
    pub id: i64,
    pub key: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub created_at: Option<String>,
}

impl MediaItem {
    pub fn url(&self) -> String {
        format!("/media/{}", self.key)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MediaSyncReport {
    pub synced: usize,
    pub total_r2_objects: usize,
    pub already_indexed: usize,
    pub truncated: bool,
}

/// Extract original filename from an R2 key formatted as "{timestamp}-{filename}"
pub fn parse_filename_from_key(key: &str) -> String {
    if let Some((_ts, rest)) = key.split_once('-') {
        if !rest.is_empty() {
            return rest.to_string();
        }
    }
    key.to_string()
}

/// Infer a standard image or video MIME type from a filename extension
pub fn guess_mime_type(filename: &str) -> &'static str {
    let ext = filename.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "ogv" | "ogg" => "video/ogg",
        _ => "application/octet-stream",
    }
}

/// Check if an R2 key represents a generated multi-tier variant (thumb or md WebP)
pub fn is_media_variant_key(key: &str) -> bool {
    key.ends_with("__thumb.webp") || key.ends_with("__md.webp")
}

/// Derive the R2 variant key for a given base key and target size ('thumb' or 'md').
/// Returns None if the base key is not a WebP image or if the size is unrecognized.
pub fn media_variant_key(base_key: &str, size: &str) -> Option<String> {
    match size {
        "thumb" | "md" => {
            if let Some(stem) = base_key.strip_suffix(".webp") {
                Some(format!("{stem}__{size}.webp"))
            } else if let Some(stem) = base_key.strip_suffix(".WEBP") {
                Some(format!("{stem}__{size}.webp"))
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_filename_from_key() {
        assert_eq!(parse_filename_from_key("1726700000000-photo.png"), "photo.png");
        assert_eq!(
            parse_filename_from_key("1726700000000-nested-dash-name.jpg"),
            "nested-dash-name.jpg"
        );
        assert_eq!(parse_filename_from_key("plain_filename.webp"), "plain_filename.webp");
    }

    #[test]
    fn test_guess_mime_type() {
        assert_eq!(guess_mime_type("avatar.png"), "image/png");
        assert_eq!(guess_mime_type("hero.jpeg"), "image/jpeg");
        assert_eq!(guess_mime_type("photo.JPG"), "image/jpeg");
        assert_eq!(guess_mime_type("diagram.svg"), "image/svg+xml");
        assert_eq!(guess_mime_type("modern.webp"), "image/webp");
        assert_eq!(guess_mime_type("hero.mp4"), "video/mp4");
        assert_eq!(guess_mime_type("background.webm"), "video/webm");
        assert_eq!(guess_mime_type("clip.ogv"), "video/ogg");
        assert_eq!(guess_mime_type("unknown.xyz"), "application/octet-stream");
    }

    #[test]
    fn test_media_item_url() {
        let item = MediaItem {
            id: 1,
            key: "1726700000000-test.png".to_string(),
            filename: "test.png".to_string(),
            mime_type: "image/png".to_string(),
            size_bytes: 1024,
            created_at: Some("2026-09-18 12:00:00".to_string()),
        };
        assert_eq!(item.url(), "/media/1726700000000-test.png");
    }

    #[test]
    fn test_is_media_variant_key() {
        assert!(is_media_variant_key("1726700000000-photo__thumb.webp"));
        assert!(is_media_variant_key("1726700000000-photo__md.webp"));
        assert!(!is_media_variant_key("1726700000000-photo.webp"));
        assert!(!is_media_variant_key("1726700000000-photo.png"));
        assert!(!is_media_variant_key("1726700000000-photo__thumb.png"));
    }

    #[test]
    fn test_media_variant_key() {
        assert_eq!(
            media_variant_key("1726700000000-photo.webp", "thumb"),
            Some("1726700000000-photo__thumb.webp".to_string())
        );
        assert_eq!(
            media_variant_key("1726700000000-photo.webp", "md"),
            Some("1726700000000-photo__md.webp".to_string())
        );
        assert_eq!(media_variant_key("1726700000000-photo.webp", "lg"), None);
        assert_eq!(media_variant_key("1726700000000-photo.png", "thumb"), None);
        assert_eq!(media_variant_key("1726700000000-vector.svg", "thumb"), None);
    }
}

