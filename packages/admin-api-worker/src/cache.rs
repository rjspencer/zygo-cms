use worker::wasm_bindgen::JsValue;
use worker::{Cache, Env, Fetch, Headers, Method, Request, RequestInit};

/// Returns the `www.` / apex counterpart of a host.
fn alternate_host(host: &str) -> String {
    match host.strip_prefix("www.") {
        Some(apex) => apex.to_string(),
        None => format!("www.{}", host),
    }
}

/// Adds the www/apex counterpart of every absolute URL so both hosts are purged.
fn with_alternate_hosts(urls: &[String]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for u in urls {
        if !out.contains(u) {
            out.push(u.clone());
        }
        let Ok(mut parsed) = worker::Url::parse(u) else { continue };
        let Some(host) = parsed.host_str().map(|h| h.to_string()) else { continue };
        if parsed.set_host(Some(&alternate_host(&host))).is_ok() {
            let alt = parsed.to_string();
            if !out.contains(&alt) {
                out.push(alt);
            }
        }
    }
    out
}

/// Sends a purge request body to the Cloudflare zone purge_cache API and logs the result.
async fn cf_purge(env: &Env, body: serde_json::Value) {
    // If Cloudflare API Token & Zone ID are set, broadcast instant purge to all data centers globally
    let cf_token = env
        .secret("CF_API_TOKEN")
        .or_else(|_| env.var("CF_API_TOKEN"))
        .ok()
        .map(|v| v.to_string());
    let cf_zone = env.var("CF_ZONE_ID").ok().map(|v| v.to_string());

    let (Some(token), Some(zone_id)) = (cf_token, cf_zone) else {
        worker::console_log!("purge: CF_API_TOKEN or CF_ZONE_ID missing, skipping global purge");
        return;
    };
    let purge_url = format!(
        "https://api.cloudflare.com/client/v4/zones/{}/purge_cache",
        zone_id
    );
    let headers = Headers::new();
    let _ = headers.set("Authorization", &format!("Bearer {}", token));
    let _ = headers.set("Content-Type", "application/json");
    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(JsValue::from_str(&body.to_string())));
    match Request::new_with_init(&purge_url, &init) {
        Ok(req) => match Fetch::Request(req).send().await {
            Ok(mut res) => {
                let status = res.status_code();
                let text = res.text().await.unwrap_or_default();
                worker::console_log!("purge: {} -> {} {}", body, status, text);
            }
            Err(e) => worker::console_error!("purge: fetch failed: {e}"),
        },
        Err(e) => worker::console_error!("purge: bad request: {e}"),
    }
}

pub async fn purge_urls(env: &Env, urls: Vec<String>) {
    // 1. Invalidate local worker Cache::default()
    let cache = Cache::default();
    for url in &urls {
        let _ = cache.delete(url.as_str(), true).await;
    }

    // 2. Broadcast a global purge, covering both the www and apex hosts
    let absolute_urls: Vec<String> = with_alternate_hosts(
        &urls
            .into_iter()
            .filter(|u| u.starts_with("http://") || u.starts_with("https://"))
            .collect::<Vec<_>>(),
    );
    if absolute_urls.is_empty() {
        worker::console_log!("purge_urls: no absolute URLs to purge");
        return;
    }
    for chunk in absolute_urls.chunks(30) {
        cf_purge(env, serde_json::json!({ "files": chunk })).await;
    }
}

/// Purges every cached object on the given origins' hosts (and their www/apex counterparts).
/// Use for site-wide changes such as theme or layout edits.
pub async fn purge_hosts(env: &Env, origins: Vec<String>) {
    let mut hosts: Vec<String> = Vec::new();
    for origin in origins {
        let Ok(parsed) = worker::Url::parse(&origin) else { continue };
        let Some(host) = parsed.host_str() else { continue };
        for h in [host.to_string(), alternate_host(host)] {
            if !hosts.contains(&h) {
                hosts.push(h);
            }
        }
    }
    if hosts.is_empty() {
        worker::console_log!("purge_hosts: no valid origins to purge");
        return;
    }
    cf_purge(env, serde_json::json!({ "hosts": hosts })).await;
}
