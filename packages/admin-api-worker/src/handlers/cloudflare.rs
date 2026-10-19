use serde_json::json;
use worker::*;
use crate::auth_required;

#[derive(serde::Deserialize, serde::Serialize, Debug, Default)]
#[serde(default)]
pub struct UpdateAiCrawlRequest {
    pub ai_bots_protection: Option<String>,
    pub ai_search: Option<String>,
    pub ai_training: Option<String>,
    pub ai_user: Option<String>,
}

pub async fn get_ai_crawl(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let api_token = match ctx.env.secret("CF_API_TOKEN").or_else(|_| ctx.env.var("CF_API_TOKEN")) {
        Ok(s) => s.to_string(),
        Err(_) => {
            return Response::from_json(&json!({
                "configured": false,
                "message": "CF_API_TOKEN not configured in worker secrets",
                "ai_bots_protection": "disabled",
                "ai_search": "disabled",
                "ai_training": "disabled",
                "ai_user": "disabled"
            }));
        }
    };

    let zone_id = match ctx.env.secret("CF_ZONE_ID").or_else(|_| ctx.env.var("CF_ZONE_ID")) {
        Ok(s) => s.to_string(),
        Err(_) => {
            return Response::from_json(&json!({
                "configured": false,
                "message": "CF_ZONE_ID not configured in worker environment",
                "ai_bots_protection": "disabled",
                "ai_search": "disabled",
                "ai_training": "disabled",
                "ai_user": "disabled"
            }));
        }
    };

    let headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", api_token))?;
    headers.set("Content-Type", "application/json")?;

    let mut request_init = RequestInit::new();
    request_init.with_method(Method::Get);
    request_init.with_headers(headers);

    let cf_url = format!("https://api.cloudflare.com/client/v4/zones/{}/bot_management", zone_id);
    let cf_req = Request::new_with_init(&cf_url, &request_init)?;
    let mut response = Fetch::Request(cf_req).send().await?;

    let status = response.status_code();
    let body_text = response.text().await.unwrap_or_default();

    if status != 200 {
        return Response::from_json(&json!({
            "configured": false,
            "error": format!("Cloudflare API returned status {}: {}", status, body_text),
            "ai_bots_protection": "disabled",
            "ai_search": "disabled",
            "ai_training": "disabled",
            "ai_user": "disabled"
        }));
    }

    let parsed: serde_json::Value = serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null);
    let result = parsed.get("result");

    let ai_bots_protection = result.and_then(|r| r.get("ai_bots_protection")).and_then(|v| v.as_str()).unwrap_or("disabled");
    let ai_search = result.and_then(|r| r.get("ai_search")).and_then(|v| v.as_str()).unwrap_or("disabled");
    let ai_training = result.and_then(|r| r.get("ai_training")).and_then(|v| v.as_str()).unwrap_or("disabled");
    let ai_user = result.and_then(|r| r.get("ai_user")).and_then(|v| v.as_str()).unwrap_or("disabled");

    Response::from_json(&json!({
        "configured": true,
        "ai_bots_protection": ai_bots_protection,
        "ai_search": ai_search,
        "ai_training": ai_training,
        "ai_user": ai_user
    }))
}

pub async fn update_ai_crawl(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return Response::error("Forbidden", 403);
    }

    let payload: UpdateAiCrawlRequest = match req.json().await {
        Ok(p) => p,
        Err(_) => return Response::error("Invalid JSON payload", 400),
    };

    let api_token = match ctx.env.secret("CF_API_TOKEN").or_else(|_| ctx.env.var("CF_API_TOKEN")) {
        Ok(s) => s.to_string(),
        Err(_) => return Response::error("CF_API_TOKEN not configured in worker secrets", 400),
    };

    let zone_id = match ctx.env.secret("CF_ZONE_ID").or_else(|_| ctx.env.var("CF_ZONE_ID")) {
        Ok(s) => s.to_string(),
        Err(_) => return Response::error("CF_ZONE_ID not configured in worker environment", 400),
    };

    let mut cf_payload = serde_json::Map::new();
    if let Some(v) = payload.ai_bots_protection {
        cf_payload.insert("ai_bots_protection".to_string(), serde_json::Value::String(v));
    }
    if let Some(v) = payload.ai_search {
        cf_payload.insert("ai_search".to_string(), serde_json::Value::String(v));
    }
    if let Some(v) = payload.ai_training {
        cf_payload.insert("ai_training".to_string(), serde_json::Value::String(v));
    }
    if let Some(v) = payload.ai_user {
        cf_payload.insert("ai_user".to_string(), serde_json::Value::String(v));
    }

    let headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", api_token))?;
    headers.set("Content-Type", "application/json")?;

    let mut request_init = RequestInit::new();
    request_init.with_method(Method::Put);
    request_init.with_headers(headers);

    let body_str = serde_json::to_string(&cf_payload).map_err(|e| worker::Error::from(e.to_string()))?;
    request_init.with_body(Some(wasm_bindgen::JsValue::from_str(&body_str)));

    let cf_url = format!("https://api.cloudflare.com/client/v4/zones/{}/bot_management", zone_id);
    let cf_req = Request::new_with_init(&cf_url, &request_init)?;
    let mut response = Fetch::Request(cf_req).send().await?;

    let status = response.status_code();
    let text = response.text().await.unwrap_or_default();

    if status >= 200 && status < 300 {
        let parsed: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
        Response::from_json(&json!({
            "success": true,
            "result": parsed.get("result").unwrap_or(&parsed)
        }))
    } else {
        Response::error(format!("Cloudflare API error ({}): {}", status, text), status)
    }
}
