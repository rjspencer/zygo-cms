use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntryRevisionSummary {
    pub id: i64,
    pub entry_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub preview_token: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntryRevision {
    pub id: i64,
    pub entry_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub body_html: String,
    pub body_json: String,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub preview_token: String,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct CreateRevisionParams {
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub body_html: String,
    pub body_json: String,
    pub category: Option<String>,
    pub tags: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revision_serialization() {
        let rev = EntryRevision {
            id: 1,
            entry_id: 10,
            title: "Revision 1".into(),
            description: Some("Desc".into()),
            cover_image: None,
            body_html: "<p>Text</p>".into(),
            body_json: "{}".into(),
            category: Some("Tech".into()),
            tags: Some("rust, wasm".into()),
            preview_token: "tok-12345".into(),
            created_at: "2026-09-20 15:30:00".into(),
        };

        let json = serde_json::to_string(&rev).expect("serialize revision");
        let deserialized: EntryRevision =
            serde_json::from_str(&json).expect("deserialize revision");
        assert_eq!(rev, deserialized);
    }

    #[test]
    fn test_revision_summary_serialization() {
        let summary = EntryRevisionSummary {
            id: 1,
            entry_id: 10,
            title: "Revision 1".into(),
            description: None,
            cover_image: None,
            category: None,
            tags: None,
            preview_token: "tok-abc".into(),
            created_at: "2026-09-20 12:00:00".into(),
        };

        let json = serde_json::to_string(&summary).expect("serialize summary");
        let deserialized: EntryRevisionSummary =
            serde_json::from_str(&json).expect("deserialize summary");
        assert_eq!(summary, deserialized);
    }
}
