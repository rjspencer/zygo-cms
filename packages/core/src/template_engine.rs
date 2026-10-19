use minijinja::{Environment, AutoEscape};

pub fn configure_env(env: &mut Environment) {
    env.set_auto_escape_callback(|_| AutoEscape::Html);

    env.add_filter("video_embed", |v: minijinja::Value| -> String {
        video_embed_filter(v.as_str().unwrap_or_default())
    });

    env.add_filter("media_srcset", |v: minijinja::Value| -> String {
        media_srcset_filter(v.as_str().unwrap_or_default())
    });
}

pub fn video_embed_filter(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if trimmed.contains("youtube.com") || trimmed.contains("youtu.be") || trimmed.contains("youtube-nocookie.com") {
        if let Some(id) = extract_youtube_id(trimmed) {
            return format!("https://www.youtube-nocookie.com/embed/{}", id);
        }
    }

    if trimmed.contains("vimeo.com") {
        if let Some(id) = extract_vimeo_id(trimmed) {
            return format!("https://player.vimeo.com/video/{}", id);
        }
    }

    String::new()
}

pub fn extract_youtube_id(url: &str) -> Option<&str> {
    if let Some(idx) = url.find("youtu.be/") {
        let rest = &url[idx + "youtu.be/".len()..];
        let end = rest.find(|c: char| c == '?' || c == '&' || c == '#' || c == '/').unwrap_or(rest.len());
        let id = &rest[..end];
        if !id.is_empty() {
            return Some(id);
        }
    }

    if let Some(idx) = url.find("/embed/") {
        let rest = &url[idx + "/embed/".len()..];
        let end = rest.find(|c: char| c == '?' || c == '&' || c == '#' || c == '/').unwrap_or(rest.len());
        let id = &rest[..end];
        if !id.is_empty() {
            return Some(id);
        }
    }

    if let Some(idx) = url.find("/shorts/") {
        let rest = &url[idx + "/shorts/".len()..];
        let end = rest.find(|c: char| c == '?' || c == '&' || c == '#' || c == '/').unwrap_or(rest.len());
        let id = &rest[..end];
        if !id.is_empty() {
            return Some(id);
        }
    }

    if let Some(idx) = url.find("v=") {
        let rest = &url[idx + 2..];
        let end = rest.find(|c: char| c == '&' || c == '#' || c == '/').unwrap_or(rest.len());
        let id = &rest[..end];
        if !id.is_empty() {
            return Some(id);
        }
    }

    None
}

pub fn extract_vimeo_id(url: &str) -> Option<&str> {
    if let Some(idx) = url.find("/video/") {
        let rest = &url[idx + "/video/".len()..];
        let end = rest.find(|c: char| c == '?' || c == '&' || c == '#' || c == '/').unwrap_or(rest.len());
        let id = &rest[..end];
        if !id.is_empty() {
            return Some(id);
        }
    }

    let without_query = match url.split_once('?') {
        Some((p, _)) => p,
        None => url,
    };
    let without_hash = match without_query.split_once('#') {
        Some((p, _)) => p,
        None => without_query,
    };
    let last = without_hash.trim_end_matches('/').rsplit('/').next()?;
    if !last.is_empty() && last.chars().all(|c| c.is_ascii_digit()) {
        return Some(last);
    }

    None
}

/// Generate responsive srcset string for local WebP images.
/// Expects a URL like `/media/{key}.webp` or `/api/media/{key}.webp`.
/// Returns `"{url}?size=thumb 400w, {url}?size=md 1024w, {url} 2048w"`.
/// Returns empty string for external URLs, non-webp images (SVG/GIF), or invalid strings.
pub fn media_srcset_filter(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // Strip query parameters and fragment to inspect path
    let path = match trimmed.split_once('?') {
        Some((p, _)) => p,
        None => trimmed,
    };
    let path = match path.split_once('#') {
        Some((p, _)) => p,
        None => path,
    };

    // Check if it is a local media path and ends with .webp
    let is_local_media = path.starts_with("/media/") || path.starts_with("/api/media/");
    let is_webp = path.to_ascii_lowercase().ends_with(".webp");

    if is_local_media && is_webp {
        format!("{path}?size=thumb 400w, {path}?size=md 1024w, {path} 2048w")
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_media_srcset_filter_valid() {
        assert_eq!(
            media_srcset_filter("/media/1726700000000-photo.webp"),
            "/media/1726700000000-photo.webp?size=thumb 400w, /media/1726700000000-photo.webp?size=md 1024w, /media/1726700000000-photo.webp 2048w"
        );
        assert_eq!(
            media_srcset_filter("/api/media/1726700000000-photo.webp?v=1"),
            "/api/media/1726700000000-photo.webp?size=thumb 400w, /api/media/1726700000000-photo.webp?size=md 1024w, /api/media/1726700000000-photo.webp 2048w"
        );
    }

    #[test]
    fn test_media_srcset_filter_invalid_or_non_webp() {
        assert_eq!(media_srcset_filter(""), "");
        assert_eq!(media_srcset_filter("/media/photo.png"), "");
        assert_eq!(media_srcset_filter("/media/vector.svg"), "");
        assert_eq!(media_srcset_filter("https://images.unsplash.com/photo.webp"), "");
    }
}
