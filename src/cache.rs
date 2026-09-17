use worker::wasm_bindgen::JsValue;
use worker::{Cache, Env, Fetch, Headers, Method, Request, RequestInit, Response, Result};

pub const DEFAULT_EDGE_TTL_SECONDS: u32 = 3600; // 1 hour fallback

/// Read EDGE_TTL_SECONDS from Cloudflare Worker env, fallback to DEFAULT_EDGE_TTL_SECONDS
pub fn edge_ttl(env: &Env) -> u32 {
    env.var("EDGE_TTL_SECONDS")
        .ok()
        .and_then(|v| v.to_string().parse::<u32>().ok())
        .unwrap_or(DEFAULT_EDGE_TTL_SECONDS)
}

/// Adds Cloudflare CDN edge caching directives with a custom TTL
pub fn add_cache_headers_with_ttl(headers: &mut Headers, s_maxage: u32) -> Result<()> {
    headers.set(
        "Cache-Control",
        &format!(
            "public, max-age=60, s-maxage={}, stale-while-revalidate=86400, stale-if-error=86400",
            s_maxage
        ),
    )?;
    Ok(())
}

/// Adds Cloudflare CDN edge caching directives (reads EDGE_TTL_SECONDS from env, default 3600s)
pub fn add_cache_headers(headers: &mut Headers, env: &Env) -> Result<()> {
    add_cache_headers_with_ttl(headers, edge_ttl(env))
}

/// Retrieve a response from the worker's local edge cache, bypassing if ?preview=true
pub async fn get_cached(req: &Request) -> Option<Response> {
    if let Ok(url) = req.url() {
        if url.query().map(|q| q.contains("preview")).unwrap_or(false) {
            return None;
        }
        let cache = Cache::default();
        if let Ok(Some(cached)) = cache.get(url.to_string(), false).await {
            return Some(cached);
        }
    }
    None
}

/// Store a response in the worker's local edge cache
pub async fn put_cached(req: &Request, res: &mut Response) {
    if let Ok(url) = req.url() {
        if let Ok(cloned) = res.cloned() {
            let cache = Cache::default();
            let _ = cache.put(url.to_string(), cloned).await;
        }
    }
}

/// Invalidate URLs in the local Worker cache, and optionally broadcast a global purge to Cloudflare's CDN network
pub async fn purge_urls(env: &Env, urls: Vec<String>) {
    // 1. Invalidate local worker Cache::default()
    let cache = Cache::default();
    for url in &urls {
        let _ = cache.delete(url.as_str(), true).await;
    }
    // 2. If Cloudflare API Token & Zone ID are set, broadcast instant purge to all 300+ data centers globally
    let cf_token = env.var("CF_API_TOKEN").ok().map(|v| v.to_string());
    let cf_zone = env.var("CF_ZONE_ID").ok().map(|v| v.to_string());
    if let (Some(token), Some(zone_id)) = (cf_token, cf_zone) {
        let purge_url = format!(
            "https://api.cloudflare.com/client/v4/zones/{}/purge_cache",
            zone_id
        );
        let headers = Headers::new();
        let _ = headers.set("Authorization", &format!("Bearer {}", token));
        let _ = headers.set("Content-Type", "application/json");
        let body = serde_json::json!({ "files": urls });
        let mut init = RequestInit::new();
        init.with_method(Method::Post);
        init.with_headers(headers);
        init.with_body(Some(JsValue::from_str(&body.to_string())));
        if let Ok(req) = Request::new_with_init(&purge_url, &init) {
            let _ = Fetch::Request(req).send().await;
        }
    }
}
