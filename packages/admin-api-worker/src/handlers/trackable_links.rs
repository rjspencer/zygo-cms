use worker::*;
use worker::wasm_bindgen::JsValue;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize, Debug)]
pub struct TrackableLink {
    pub id: i64,
    pub entry_id: i64,
    pub name: String,
    pub url_params: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateLinkReq {
    pub name: String,
    pub url_params: String,
}

pub async fn list_links(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    
    let entry_id = match ctx.param("id").and_then(|id| id.parse::<i64>().ok()) {
        Some(id) => id,
        None => return Response::error("Invalid entry ID", 400),
    };

    let db = ctx.env.d1("DB")?;
    let query = "SELECT * FROM trackable_links WHERE entry_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
    
    let stmt = db.prepare(query).bind(&[JsValue::from_f64(entry_id as f64)])?;
    let results = stmt.all().await?;
    
    let links: Vec<TrackableLink> = match results.results() {
        Ok(res) => res,
        Err(_) => return Response::error("Failed to query links", 500),
    };
    
    Response::from_json(&links)
}

pub async fn create_link(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    
    let entry_id = match ctx.param("id").and_then(|id| id.parse::<i64>().ok()) {
        Some(id) => id,
        None => return Response::error("Invalid entry ID", 400),
    };

    let payload: CreateLinkReq = match req.json().await {
        Ok(p) => p,
        Err(_) => return Response::error("Invalid JSON", 400),
    };

    let db = ctx.env.d1("DB")?;
    let query = "INSERT INTO trackable_links (entry_id, name, url_params) VALUES (?, ?, ?) RETURNING *";
    
    let stmt = db.prepare(query).bind(&[
        JsValue::from_f64(entry_id as f64),
        JsValue::from_str(&payload.name),
        JsValue::from_str(&payload.url_params),
    ])?;
    
    let result = stmt.first::<TrackableLink>(None).await?;
    
    match result {
        Some(link) => Response::from_json(&link),
        None => Response::error("Failed to create link", 500),
    }
}

pub async fn delete_link(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    
    let link_id = match ctx.param("id").and_then(|id| id.parse::<i64>().ok()) {
        Some(id) => id,
        None => return Response::error("Invalid link ID", 400),
    };

    let db = ctx.env.d1("DB")?;
    let query = "UPDATE trackable_links SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?";
    
    let stmt = db.prepare(query).bind(&[JsValue::from_f64(link_id as f64)])?;
    let _ = stmt.run().await?;
    
    Response::from_json(&json!({ "success": true }))
}
