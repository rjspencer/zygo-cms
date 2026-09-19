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

/// Infer a standard image MIME type from a filename extension
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
        _ => "application/octet-stream",
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
}

