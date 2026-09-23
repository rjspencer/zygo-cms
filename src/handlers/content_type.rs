use crate::db;
use crate::models::{ContentTypePayload, User};
use crate::auth_required;
use crate::error::AppError;
use serde_json::json;
use worker::{Context, Request, Response, Result, RouteContext};

pub async fn list_content_types(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let types = db::content_type::get_all(&d1).await?;
    Response::from_json(&types)
}

pub async fn get_content_type(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    match db::content_type::get_by_id(&d1, id).await? {
        Some(ct) => Response::from_json(&ct),
        None => AppError::NotFound.to_response(),
    }
}

pub async fn upsert_content_type(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return AppError::Unauthorized("Only admins can manage content types".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    let payload = match req.json::<ContentTypePayload>().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON payload".into()).to_response(),
    };
    
    // Core types cannot be edited/deleted (or at least their IDs)
    // Actually, maybe they can be edited to add fields! Let's allow upsert for all.
    
    match db::content_type::upsert(&d1, id, &payload).await {
        Ok(_) => Response::from_json(&json!({"success": true})),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn delete_content_type(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = auth_required!(&req, ctx);
    if user.role != "admin" {
        return AppError::Unauthorized("Only admins can manage content types".into()).to_response();
    }
    
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    
    if id == "post" || id == "page" {
        return AppError::BadRequest("Cannot delete core content types".into()).to_response();
    }
    
    match db::content_type::delete(&d1, id).await {
        Ok(true) => Response::from_json(&json!({"success": true})),
        Ok(false) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}
