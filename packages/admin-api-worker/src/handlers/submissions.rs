use worker::*;
use zygo_core::{
    db,
    error::AppError,
    models::UpdateFormSubmissionStatus,
};

pub fn parse_pagination(page: Option<&str>, per_page: Option<&str>) -> (i64, i64, i64) {
    let p = page.and_then(|v| v.parse::<i64>().ok()).unwrap_or(1).max(1);
    let pp = per_page
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(20)
        .clamp(1, 100);
    let offset = (p - 1) * pp;
    (p, pp, offset)
}

pub fn parse_status_filter(status: Option<&str>) -> Option<&str> {
    match status {
        Some(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("all") {
                None
            } else {
                Some(trimmed)
            }
        }
        None => None,
    }
}

pub fn forbidden_admin_required() -> Result<Response> {
    Response::from_json(&serde_json::json!({
        "error": "Admin role required"
    }))
    .map(|resp| resp.with_status(403))
}

/// GET /api/submissions
/// Query params: page (default 1), per_page (default 20, max 100), status (optional: "unread", "read", "archived", or empty for all), form_name (optional), q (optional text search)
pub async fn list_submissions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    if user.role != "admin" {
        return forbidden_admin_required();
    }

    let url = req.url()?;
    let query_map: std::collections::HashMap<String, String> =
        url.query_pairs().into_owned().collect();

    let (page, per_page, offset) = parse_pagination(
        query_map.get("page").map(|s| s.as_str()),
        query_map.get("per_page").map(|s| s.as_str()),
    );

    let status_filter = parse_status_filter(query_map.get("status").map(|s| s.as_str()));
    let form_name_filter = query_map
        .get("form_name")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());
    let q_filter = query_map
        .get("q")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let db = ctx.env.d1("DB")?;
    let (items, total) = db::form_submission::list(
        &db,
        status_filter,
        form_name_filter,
        q_filter,
        per_page,
        offset,
    )
    .await?;

    let total_pages = ((total + per_page - 1) / per_page).max(1);

    Response::from_json(&serde_json::json!({
        "items": items,
        "submissions": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }))
}

/// GET /api/submissions/stats
pub async fn get_submission_stats(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    if user.role != "admin" {
        return forbidden_admin_required();
    }

    let db = ctx.env.d1("DB")?;
    let stats = db::form_submission::get_stats(&db).await?;

    Response::from_json(&serde_json::json!({
        "unread_count": stats.unread_count,
        "read_count": stats.read_count,
        "archived_count": stats.archived_count,
        "total_count": stats.total_count
    }))
}

/// GET /api/submissions/:id
pub async fn get_submission(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    if user.role != "admin" {
        return forbidden_admin_required();
    }

    let id = match ctx.param("id").and_then(|i| i.parse::<i64>().ok()) {
        Some(id) => id,
        None => return AppError::BadRequest("Invalid submission ID".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;
    match db::form_submission::find_by_id(&db, id).await? {
        Some(submission) => Response::from_json(&submission),
        None => AppError::NotFound.to_response(),
    }
}

/// PUT /api/submissions/:id
pub async fn update_submission_status(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    if user.role != "admin" {
        return forbidden_admin_required();
    }

    let id = match ctx.param("id").and_then(|i| i.parse::<i64>().ok()) {
        Some(id) => id,
        None => return AppError::BadRequest("Invalid submission ID".into()).to_response(),
    };

    let payload: UpdateFormSubmissionStatus = match req.json().await {
        Ok(p) => p,
        Err(_) => return AppError::BadRequest("Invalid JSON body".into()).to_response(),
    };

    if let Err(err) = payload.validate() {
        return err.to_response();
    }

    let db = ctx.env.d1("DB")?;
    match db::form_submission::update_status(&db, id, payload.status.trim()).await? {
        Some(updated) => Response::from_json(&updated),
        None => AppError::NotFound.to_response(),
    }
}

/// DELETE /api/submissions/:id
pub async fn delete_submission(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let user = crate::auth_required!(&req, ctx);
    if user.role != "admin" {
        return forbidden_admin_required();
    }

    let id = match ctx.param("id").and_then(|i| i.parse::<i64>().ok()) {
        Some(id) => id,
        None => return AppError::BadRequest("Invalid submission ID".into()).to_response(),
    };

    let db = ctx.env.d1("DB")?;
    let deleted = db::form_submission::delete(&db, id).await?;
    if deleted {
        Response::from_json(&serde_json::json!({ "deleted": true }))
    } else {
        AppError::NotFound.to_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use zygo_core::models::FormSubmission;

    #[test]
    fn test_form_submission_status_cycle() {
        let mut sub = FormSubmission::default();
        assert_eq!(sub.status, "unread");
        sub.status = "read".to_string();
        assert_eq!(sub.status, "read");
        sub.status = "archived".to_string();
        assert_eq!(sub.status, "archived");
    }

    #[test]
    fn test_parse_pagination_defaults() {
        let (page, per_page, offset) = parse_pagination(None, None);
        assert_eq!(page, 1);
        assert_eq!(per_page, 20);
        assert_eq!(offset, 0);
    }

    #[test]
    fn test_parse_pagination_custom_values() {
        let (page, per_page, offset) = parse_pagination(Some("3"), Some("50"));
        assert_eq!(page, 3);
        assert_eq!(per_page, 50);
        assert_eq!(offset, 100);
    }

    #[test]
    fn test_parse_pagination_clamps_and_bounds() {
        // page < 1 should become 1
        let (page, per_page, offset) = parse_pagination(Some("0"), Some("500"));
        assert_eq!(page, 1);
        assert_eq!(per_page, 100); // capped at 100
        assert_eq!(offset, 0);

        let (page, per_page, _) = parse_pagination(Some("-5"), Some("-10"));
        assert_eq!(page, 1);
        assert_eq!(per_page, 1); // clamped to 1
    }

    #[test]
    fn test_parse_status_filter() {
        assert_eq!(parse_status_filter(None), None);
        assert_eq!(parse_status_filter(Some("")), None);
        assert_eq!(parse_status_filter(Some("   ")), None);
        assert_eq!(parse_status_filter(Some("all")), None);
        assert_eq!(parse_status_filter(Some("ALL")), None);
        assert_eq!(parse_status_filter(Some("unread")), Some("unread"));
        assert_eq!(parse_status_filter(Some(" read  ")), Some("read"));
        assert_eq!(parse_status_filter(Some("archived")), Some("archived"));
    }

    #[test]
    fn test_update_status_validation() {
        let valid_unread = UpdateFormSubmissionStatus {
            status: "unread".to_string(),
        };
        assert!(valid_unread.validate().is_ok());

        let valid_read = UpdateFormSubmissionStatus {
            status: "read".to_string(),
        };
        assert!(valid_read.validate().is_ok());

        let valid_archived = UpdateFormSubmissionStatus {
            status: "archived".to_string(),
        };
        assert!(valid_archived.validate().is_ok());

        let invalid = UpdateFormSubmissionStatus {
            status: "deleted".to_string(),
        };
        assert!(invalid.validate().is_err());
    }
}
