use worker::*;
pub fn test_cors(res: Response, origin: &str) -> Result<Response> {
    let cors = Cors::new()
        .with_credentials(true)
        .with_origins(vec![origin])
        .with_allowed_headers(vec!["*"])
        .with_methods(vec![Method::Get, Method::Post, Method::Put, Method::Delete, Method::Options]);
    res.with_cors(&cors)
}
