use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct User {
    pub id: i64,
    pub auth_provider_id: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub avatar_url: Option<String>,
}

impl Default for User {
    fn default() -> Self {
        Self {
            id: 0,
            auth_provider_id: String::new(),
            email: None,
            display_name: None,
            role: "author".to_string(),
            created_at: String::new(),
            updated_at: String::new(),
            deleted_at: None,
            bio: None,
            website: None,
            avatar_url: None,
        }
    }
}

/// Canonical user roles supported by the CMS.
pub const VALID_USER_ROLES: &[&str] = &["admin", "editor", "author"];

/// Validates and normalizes a user role string, returning the canonical lowercase role
/// or an error message if unsupported.
pub fn validate_user_role(role: &str) -> Result<String, String> {
    let normalized = role.trim().to_ascii_lowercase();
    if VALID_USER_ROLES.contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err(format!(
            "Invalid role '{}'. Must be one of: {}",
            role.trim(),
            VALID_USER_ROLES.join(", ")
        ))
    }
}

/// Returns true if the role carries editorial privileges (`admin` or `editor`).
pub fn is_editorial_role(role: &str) -> bool {
    matches!(role.trim().to_ascii_lowercase().as_str(), "admin" | "editor")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_user_role_accepts_valid_roles() {
        assert_eq!(validate_user_role("admin").unwrap(), "admin");
        assert_eq!(validate_user_role("editor").unwrap(), "editor");
        assert_eq!(validate_user_role("author").unwrap(), "author");
        assert_eq!(validate_user_role("  Editor ").unwrap(), "editor");
        assert_eq!(validate_user_role("ADMIN").unwrap(), "admin");
    }

    #[test]
    fn test_validate_user_role_rejects_invalid_roles() {
        assert!(validate_user_role("").is_err());
        assert!(validate_user_role("   ").is_err());
        assert!(validate_user_role("superadmin").is_err());
        assert!(validate_user_role("viewer").is_err());
    }

    #[test]
    fn test_is_editorial_role() {
        assert!(is_editorial_role("admin"));
        assert!(is_editorial_role("editor"));
        assert!(is_editorial_role(" Editor "));
        assert!(!is_editorial_role("author"));
        assert!(!is_editorial_role(""));
    }
}
