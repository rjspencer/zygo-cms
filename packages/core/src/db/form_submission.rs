use super::opt_js;
use crate::models::{CreateFormSubmission, FormSubmission, SubmissionStats};
use serde::Deserialize;
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

pub const FORM_SUBMISSION_COLUMNS: &str =
    "id, form_name, page_path, sender_name, sender_email, subject, message, metadata_json, status, created_at";

#[derive(Deserialize)]
struct CountResult {
    count: i64,
}

pub async fn create(db: &D1Database, submission: &CreateFormSubmission) -> Result<FormSubmission> {
    let form_name = submission.form_name.as_deref().unwrap_or("contact");
    let message = submission.message.as_deref().unwrap_or("");
    let metadata_json = submission.metadata_json.as_deref().unwrap_or("{}");

    let query = format!(
        "INSERT INTO form_submissions (form_name, page_path, sender_name, sender_email, subject, message, metadata_json, status, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'unread', CURRENT_TIMESTAMP) \
         RETURNING {FORM_SUBMISSION_COLUMNS}"
    );
    let statement = db.prepare(&query);
    let result = statement
        .bind(&[
            form_name.into(),
            opt_js(&submission.page_path),
            opt_js(&submission.sender_name),
            submission.sender_email.as_str().into(),
            opt_js(&submission.subject),
            message.into(),
            metadata_json.into(),
        ])?
        .first::<FormSubmission>(None)
        .await?;

    match result {
        Some(sub) => Ok(sub),
        None => Err(worker::Error::RustError(
            "Failed to insert form submission".into(),
        )),
    }
}

pub async fn find_by_id(db: &D1Database, id: i64) -> Result<Option<FormSubmission>> {
    let query = format!("SELECT {FORM_SUBMISSION_COLUMNS} FROM form_submissions WHERE id = ?1");
    let statement = db.prepare(&query);
    statement
        .bind(&[JsValue::from(id as f64)])?
        .first::<FormSubmission>(None)
        .await
}

pub async fn list(
    db: &D1Database,
    status: Option<&str>,
    form_name: Option<&str>,
    q: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<FormSubmission>, i64)> {
    let mut conditions = Vec::new();
    let mut bindings: Vec<JsValue> = Vec::new();
    let mut param_idx = 1;

    if let Some(s) = status.filter(|s| !s.trim().is_empty()) {
        conditions.push(format!("status = ?{}", param_idx));
        bindings.push(s.trim().into());
        param_idx += 1;
    }

    if let Some(f) = form_name.filter(|f| !f.trim().is_empty()) {
        conditions.push(format!("form_name = ?{}", param_idx));
        bindings.push(f.trim().into());
        param_idx += 1;
    }

    if let Some(query_str) = q.filter(|term| !term.trim().is_empty()) {
        let pattern = format!("%{}%", query_str.trim());
        conditions.push(format!(
            "(sender_name LIKE ?{0} OR sender_email LIKE ?{0} OR subject LIKE ?{0} OR message LIKE ?{0})",
            param_idx
        ));
        bindings.push(pattern.into());
        param_idx += 1;
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // 1. Total count query
    let count_query = format!("SELECT COUNT(id) as count FROM form_submissions {where_clause}");
    let count_stmt = db.prepare(&count_query);
    let count_res = if bindings.is_empty() {
        count_stmt.first::<CountResult>(None).await?
    } else {
        count_stmt.bind(&bindings)?.first::<CountResult>(None).await?
    };
    let total_count = count_res.map(|c| c.count).unwrap_or(0);

    // 2. Paginated data query
    let data_query = format!(
        "SELECT {FORM_SUBMISSION_COLUMNS} FROM form_submissions {where_clause} ORDER BY created_at DESC, id DESC LIMIT ?{param_idx} OFFSET ?{}",
        param_idx + 1
    );
    let mut data_bindings = bindings;
    data_bindings.push(JsValue::from(limit as f64));
    data_bindings.push(JsValue::from(offset as f64));

    let data_stmt = db.prepare(&data_query);
    let result = data_stmt.bind(&data_bindings)?.all().await?;
    let items = result.results::<FormSubmission>()?;

    Ok((items, total_count))
}

pub async fn update_status(
    db: &D1Database,
    id: i64,
    status: &str,
) -> Result<Option<FormSubmission>> {
    let query = format!(
        "UPDATE form_submissions SET status = ?1 WHERE id = ?2 \
         RETURNING {FORM_SUBMISSION_COLUMNS}"
    );
    let statement = db.prepare(&query);
    statement
        .bind(&[status.into(), JsValue::from(id as f64)])?
        .first::<FormSubmission>(None)
        .await
}

pub async fn delete(db: &D1Database, id: i64) -> Result<bool> {
    let query = "DELETE FROM form_submissions WHERE id = ?1";
    let statement = db.prepare(query);
    let result = statement.bind(&[JsValue::from(id as f64)])?.run().await?;
    let changes = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    Ok(changes > 0)
}

pub async fn get_stats(db: &D1Database) -> Result<SubmissionStats> {
    let query = "SELECT \
        COUNT(id) as total_count, \
        COALESCE(SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END), 0) as unread_count \
        FROM form_submissions";
    let statement = db.prepare(query);
    let stats = statement
        .first::<SubmissionStats>(None)
        .await?
        .unwrap_or_default();
    Ok(stats)
}
