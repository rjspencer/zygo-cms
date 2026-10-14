use worker::*;


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

/// Determines if an origin is permitted based on admin subdomain / origin and request host.
pub fn is_allowed_origin(
    origin: &str,
    req_host: Option<&str>,
    admin_subdomain: Option<&str>,
    admin_origin_override: Option<&str>,
) -> bool {
    let trimmed_origin = origin.trim().trim_end_matches('/');
    if trimmed_origin.is_empty() {
        return false;
    }

    // 1. Direct explicit override match
    if let Some(admin_origin) = admin_origin_override {
        let trimmed_override = admin_origin.trim().trim_end_matches('/');
        if !trimmed_override.is_empty() && trimmed_origin == trimmed_override {
            return true;
        }
    }

    // 2. Local development origins
    if trimmed_origin.starts_with("http://localhost:")
        || trimmed_origin == "http://localhost"
        || trimmed_origin.starts_with("http://127.0.0.1:")
        || trimmed_origin == "http://127.0.0.1"
    {
        return true;
    }

    // 3. Subdomain matching from request host
    let sub = admin_subdomain.unwrap_or("admin").trim();
    if let Some(host) = req_host {
        let root_domain = host.strip_prefix("www.").unwrap_or(host);
        let expected_admin_host = format!("{}.{}", sub, root_domain);

        // Check if origin host matches expected_admin_host
        if let Ok(origin_url) = worker::Url::parse(trimmed_origin) {
            if origin_url.host_str() == Some(&expected_admin_host) {
                return true;
            }
        }
    }

    false
}

/// Extracts the incoming Origin header and validates it against configured admin origins.
/// Returns Some(origin) if authorized, None otherwise.
pub fn get_allowed_cors_origin(req: &Request, env: &Env) -> Option<String> {
    let origin = req.headers().get("Origin").ok().flatten()?;
    let req_host = req.url().ok().and_then(|u| u.host_str().map(|s| s.to_string()));
    let admin_subdomain = env.var("ADMIN_SUBDOMAIN").ok().map(|v| v.to_string());
    let admin_origin_override = env.var("ADMIN_ORIGIN").ok().map(|v| v.to_string());

    if is_allowed_origin(
        &origin,
        req_host.as_deref(),
        admin_subdomain.as_deref(),
        admin_origin_override.as_deref(),
    ) {
        Some(origin)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allowed_origin_matching() {
        // Standard admin subdomain matching root host
        assert!(is_allowed_origin(
            "https://admin.zygodactylstudios.com",
            Some("zygodactylstudios.com"),
            Some("admin"),
            None
        ));

        // Matching with www. prefix on public site
        assert!(is_allowed_origin(
            "https://admin.zygodactylstudios.com",
            Some("www.zygodactylstudios.com"),
            Some("admin"),
            None
        ));

        // Local development origins
        assert!(is_allowed_origin(
            "http://localhost:5173",
            Some("127.0.0.1:8788"),
            Some("admin"),
            None
        ));
        assert!(is_allowed_origin(
            "http://127.0.0.1:5173",
            Some("127.0.0.1:8788"),
            Some("admin"),
            None
        ));

        // Custom origin override
        assert!(is_allowed_origin(
            "https://custom-admin.corp.net",
            Some("zygodactylstudios.com"),
            Some("admin"),
            Some("https://custom-admin.corp.net")
        ));

        // Unauthorized origins rejected
        assert!(!is_allowed_origin(
            "https://evil.com",
            Some("zygodactylstudios.com"),
            Some("admin"),
            None
        ));
        assert!(!is_allowed_origin(
            "https://admin.evil.com",
            Some("zygodactylstudios.com"),
            Some("admin"),
            None
        ));
    }
}


