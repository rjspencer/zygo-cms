use worker::wasm_bindgen::JsValue;
use worker::{Cache, Env, Fetch, Headers, Method, Request, RequestInit};

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
        for chunk in urls.chunks(30) {
            let headers = Headers::new();
            let _ = headers.set("Authorization", &format!("Bearer {}", token));
            let _ = headers.set("Content-Type", "application/json");
            let body = serde_json::json!({ "files": chunk });
            let mut init = RequestInit::new();
            init.with_method(Method::Post);
            init.with_headers(headers);
            init.with_body(Some(JsValue::from_str(&body.to_string())));
            if let Ok(req) = Request::new_with_init(&purge_url, &init) {
                let _ = Fetch::Request(req).send().await;
            }
        }
    }
}
