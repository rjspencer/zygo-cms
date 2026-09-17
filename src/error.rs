use worker::{Response, Result};

#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Database(worker::Error),
    NotFound,
    Unauthorized(String),
}

impl From<worker::Error> for AppError {
    fn from(err: worker::Error) -> Self {
        AppError::Database(err)
    }
}

impl AppError {
    /// Convert domain errors into clean JSON HTTP responses
    pub fn to_response(&self) -> Result<Response> {
        let (status, message) = match self {
            AppError::BadRequest(msg) => (400, msg.clone()),
            AppError::Database(err) => {
                worker::console_log!("Database error: {:?}", err);
                (500, "Internal Server Error".to_string())
            }
            AppError::NotFound => (404, "Entry not found".to_string()),
            AppError::Unauthorized(msg) => (401, msg.clone()),
        };

        Response::from_json(&serde_json::json!({
            "error": message
        }))
        .map(|resp| resp.with_status(status))
    }
}
