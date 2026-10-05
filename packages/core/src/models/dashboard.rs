use serde::{Deserialize, Serialize};
use super::menu::MenuItem;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct DashboardResponse {
    pub page_count: i64,
    pub post_count: i64,
    pub author_count: i64,
    pub media_count: i64,
    pub auth_url: Option<String>,
    pub header_menu: Vec<MenuItem>,
    pub footer_menu: Vec<MenuItem>,
    pub analytics_enabled: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dashboard_response_defaults_and_unknown_fields() {
        let json = r#"{"page_count": 5, "unknown_field": "ignored"}"#;
        let resp: DashboardResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(resp.page_count, 5);
        assert_eq!(resp.post_count, 0);
        assert_eq!(resp.author_count, 0);
        assert_eq!(resp.media_count, 0);
        assert_eq!(resp.auth_url, None);
        assert!(resp.header_menu.is_empty());
        assert!(resp.footer_menu.is_empty());
        assert!(!resp.analytics_enabled);
    }

    #[test]
    fn test_dashboard_response_serialization() {
        let resp = DashboardResponse {
            page_count: 10,
            post_count: 20,
            author_count: 2,
            media_count: 15,
            auth_url: Some("/logout".into()),
            header_menu: vec![],
            footer_menu: vec![],
            analytics_enabled: true,
        };
        let serialized = serde_json::to_string(&resp).expect("serialize");
        let deserialized: DashboardResponse = serde_json::from_str(&serialized).expect("deserialize");
        assert_eq!(deserialized.page_count, 10);
        assert_eq!(deserialized.post_count, 20);
        assert_eq!(deserialized.media_count, 15);
        assert_eq!(deserialized.auth_url.as_deref(), Some("/logout"));
        assert!(deserialized.analytics_enabled);
    }
}
