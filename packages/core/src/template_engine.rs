use minijinja::{Environment, AutoEscape};

pub fn configure_env(env: &mut Environment) {
    env.set_auto_escape_callback(|_| AutoEscape::Html);

    env.add_filter("video_embed", |v: minijinja::Value| -> String {
        video_embed_filter(v.as_str().unwrap_or_default())
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
