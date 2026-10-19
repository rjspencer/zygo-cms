use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Redirect {
    pub id: i64,
    pub source_path: String,
    pub target_url: String,
    pub status_code: i32,
    pub notes: Option<String>,
    pub hit_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for Redirect {
    fn default() -> Self {
        Self {
            id: 0,
            source_path: String::new(),
            target_url: String::new(),
            status_code: 301,
            notes: None,
            hit_count: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct CreateRedirectReq {
    pub source_path: String,
    pub target_url: String,
    pub status_code: i32,
    pub notes: Option<String>,
}

impl Default for CreateRedirectReq {
    fn default() -> Self {
        Self {
            source_path: String::new(),
            target_url: String::new(),
            status_code: 301,
            notes: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct UpdateRedirectReq {
    pub source_path: Option<String>,
    pub target_url: Option<String>,
    pub status_code: Option<i32>,
    pub notes: Option<String>,
}

impl Default for UpdateRedirectReq {
    fn default() -> Self {
        Self {
            source_path: None,
            target_url: None,
            status_code: None,
            notes: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redirect_deserialization_defaults() {
        let json = r#"{"id": 1, "source_path": "/old", "target_url": "/new"}"#;
        let r: Redirect = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(r.id, 1);
        assert_eq!(r.source_path, "/old");
        assert_eq!(r.target_url, "/new");
        assert_eq!(r.status_code, 301);
        assert_eq!(r.hit_count, 0);
        assert_eq!(r.notes, None);
    }

    #[test]
    fn test_redirect_skip_unknown_fields() {
        let json = r#"{"id": 2, "source_path": "/a", "target_url": "/b", "unknown_col": "extra"}"#;
        let r: Redirect = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(r.id, 2);
    }

    #[test]
    fn test_create_redirect_req_defaults() {
        let json = r#"{"source_path": "/promo", "target_url": "https://example.com/promo"}"#;
        let req: CreateRedirectReq = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(req.source_path, "/promo");
        assert_eq!(req.target_url, "https://example.com/promo");
        assert_eq!(req.status_code, 301);
        assert_eq!(req.notes, None);
    }

    #[test]
    fn test_update_redirect_req_partial() {
        let json = r#"{"target_url": "/updated"}"#;
        let req: UpdateRedirectReq = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(req.source_path, None);
        assert_eq!(req.target_url, Some("/updated".to_string()));
        assert_eq!(req.status_code, None);
        assert_eq!(req.notes, None);
    }
}
