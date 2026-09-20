use worker::*;

pub fn get_auth_url(env: &Env) -> String {
    env.var("PROPELAUTH_AUTH_URL")
        .map(|v| v.to_string())
        .unwrap_or_default()
}

/// Resolves the canonical site origin.
/// 1. Uses CANONICAL_ORIGIN or SITE_URL from environment if configured.
/// 2. Otherwise auto-normalizes from the request by stripping 'www.' to prevent duplicate content penalties.
pub fn get_canonical_origin(req: &Request, env: &Env) -> String {
    if let Ok(val) = env.var("CANONICAL_ORIGIN").or_else(|_| env.var("SITE_URL")) {
        let trimmed = val.to_string().trim().trim_end_matches('/').to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }

    if let Ok(url) = req.url() {
        let scheme = url.scheme();
        if let Some(host) = url.host_str() {
            let normalized_host = host.strip_prefix("www.").unwrap_or(host);
            if let Some(port) = url.port() {
                return format!("{}://{}:{}", scheme, normalized_host, port);
            }
            return format!("{}://{}", scheme, normalized_host);
        }
    }

    "".to_string()
}

pub const DEFAULT_PAGE_SIZE: i64 = 10;

/// Safely extracts and validates the ?page= query parameter (defaults to 1, minimum 1)
pub fn parse_page_param(req: &Request) -> i64 {
    if let Ok(url) = req.url() {
        for (k, v) in url.query_pairs() {
            if k == "page" {
                if let Ok(p) = v.parse::<i64>() {
                    if p > 0 {
                        return p;
                    }
                }
            }
        }
    }
    1
}

/// Retrieves the configured page size from the environment or falls back to DEFAULT_PAGE_SIZE (10)
pub fn get_page_size(env: &Env) -> i64 {
    env.var("POSTS_PER_PAGE")
        .ok()
        .and_then(|v| v.to_string().parse::<i64>().ok())
        .filter(|&size| size > 0)
        .unwrap_or(DEFAULT_PAGE_SIZE)
}

#[cfg(target_arch = "wasm32")]
pub fn generate_preview_token() -> String {
    use worker::wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = crypto, js_name = randomUUID)]
        fn js_random_uuid() -> String;
    }

    js_random_uuid().replace('-', "")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn generate_preview_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("prev{:x}", nanos)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_preview_token_format() {
        let tok1 = generate_preview_token();
        let tok2 = generate_preview_token();
        assert!(!tok1.is_empty());
        assert!(!tok2.is_empty());
        assert_ne!(tok1, tok2);
    }
}

