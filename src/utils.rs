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
