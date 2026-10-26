use serde::{Deserialize, Serialize};
use crate::error::AppError;

pub const MAX_NAME_LEN: usize = 128;
pub const MAX_EMAIL_LEN: usize = 254;
pub const MAX_SUBJECT_LEN: usize = 255;
pub const MAX_MESSAGE_LEN: usize = 5000;
pub const MAX_METADATA_LEN: usize = 2048;

pub const VALID_SUBMISSION_STATUSES: &[&str] = &["unread", "read", "archived"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct FormSubmission {
    pub id: i64,
    pub form_name: String,
    pub page_path: Option<String>,
    pub sender_name: Option<String>,
    pub sender_email: String,
    pub subject: Option<String>,
    pub message: String,
    pub metadata_json: Option<String>,
    pub status: String,
    pub created_at: String,
}

impl Default for FormSubmission {
    fn default() -> Self {
        Self {
            id: 0,
            form_name: "contact".to_string(),
            page_path: None,
            sender_name: None,
            sender_email: String::new(),
            subject: None,
            message: String::new(),
            metadata_json: Some("{}".to_string()),
            status: "unread".to_string(),
            created_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct CreateFormSubmission {
    pub form_name: Option<String>,
    pub page_path: Option<String>,
    pub sender_name: Option<String>,
    pub sender_email: String,
    pub subject: Option<String>,
    pub message: Option<String>,
    pub metadata_json: Option<String>,
}

impl CreateFormSubmission {
    pub fn validate(&self) -> Result<(), AppError> {
        let email = self.sender_email.trim();
        if email.is_empty() {
            return Err(AppError::BadRequest("Sender email is required".into()));
        }
        if email.len() > MAX_EMAIL_LEN {
            return Err(AppError::BadRequest(format!(
                "Sender email exceeds maximum length of {} characters",
                MAX_EMAIL_LEN
            )));
        }
        if email.contains('\n') || email.contains('\r') {
            return Err(AppError::BadRequest(
                "Sender email must not contain line breaks".into(),
            ));
        }
        if !is_valid_email_format(email) {
            return Err(AppError::BadRequest(
                "Invalid sender email address format".into(),
            ));
        }

        if let Some(ref name) = self.sender_name {
            if name.len() > MAX_NAME_LEN {
                return Err(AppError::BadRequest(format!(
                    "Sender name exceeds maximum length of {} characters",
                    MAX_NAME_LEN
                )));
            }
            if name.contains('\n') || name.contains('\r') {
                return Err(AppError::BadRequest(
                    "Sender name must not contain line breaks".into(),
                ));
            }
        }

        if let Some(ref subj) = self.subject {
            if subj.len() > MAX_SUBJECT_LEN {
                return Err(AppError::BadRequest(format!(
                    "Subject exceeds maximum length of {} characters",
                    MAX_SUBJECT_LEN
                )));
            }
            if subj.contains('\n') || subj.contains('\r') {
                return Err(AppError::BadRequest(
                    "Subject must not contain line breaks".into(),
                ));
            }
        }

        if let Some(ref msg) = self.message {
            if msg.len() > MAX_MESSAGE_LEN {
                return Err(AppError::BadRequest(format!(
                    "Message exceeds maximum length of {} characters",
                    MAX_MESSAGE_LEN
                )));
            }
        }

        if let Some(ref form) = self.form_name {
            if form.len() > 64 {
                return Err(AppError::BadRequest(
                    "Form name exceeds maximum length of 64 characters".into(),
                ));
            }
            if form.contains('\n') || form.contains('\r') {
                return Err(AppError::BadRequest(
                    "Form name must not contain line breaks".into(),
                ));
            }
        }

        if let Some(ref meta) = self.metadata_json {
            if meta.len() > MAX_METADATA_LEN {
                return Err(AppError::BadRequest(format!(
                    "Metadata JSON exceeds maximum length of {} characters",
                    MAX_METADATA_LEN
                )));
            }
            if !meta.trim().is_empty() && serde_json::from_str::<serde_json::Value>(meta).is_err() {
                return Err(AppError::BadRequest("Metadata must be valid JSON".into()));
            }
        }

        Ok(())
    }
}

fn is_valid_email_format(email: &str) -> bool {
    if email.contains(' ') || email.contains('\t') {
        return false;
    }
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    let (local, domain) = (parts[0], parts[1]);
    if local.is_empty() || domain.is_empty() {
        return false;
    }
    if !domain.contains('.') {
        return false;
    }
    if domain.starts_with('.') || domain.ends_with('.') {
        return false;
    }
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct UpdateFormSubmissionStatus {
    pub status: String,
}

impl UpdateFormSubmissionStatus {
    pub fn validate(&self) -> Result<(), AppError> {
        let status = self.status.trim();
        if !VALID_SUBMISSION_STATUSES.contains(&status) {
            return Err(AppError::BadRequest(format!(
                "Invalid status '{}'. Allowed values are: {}",
                self.status,
                VALID_SUBMISSION_STATUSES.join(", ")
            )));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct SubmissionStats {
    pub unread_count: i64,
    pub read_count: i64,
    pub archived_count: i64,
    pub total_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_form_submission_defaults() {
        let sub = FormSubmission::default();
        assert_eq!(sub.id, 0);
        assert_eq!(sub.form_name, "contact");
        assert_eq!(sub.status, "unread");
        assert_eq!(sub.message, "");
        assert_eq!(sub.sender_email, "");
    }

    #[test]
    fn test_form_submission_deserialization_defaults() {
        let json = r#"{"id": 10, "sender_email": "hello@example.com"}"#;
        let sub: FormSubmission = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(sub.id, 10);
        assert_eq!(sub.sender_email, "hello@example.com");
        assert_eq!(sub.form_name, "contact");
        assert_eq!(sub.status, "unread");
        assert_eq!(sub.message, "");
        assert_eq!(sub.sender_name, None);
    }

    #[test]
    fn test_create_form_submission_validation_success() {
        let req = CreateFormSubmission {
            form_name: Some("contact".into()),
            page_path: Some("/contact".into()),
            sender_name: Some("Jane Doe".into()),
            sender_email: "jane@example.com".into(),
            subject: Some("Inquiry".into()),
            message: Some("Hello there!".into()),
            metadata_json: Some(r#"{"phone":"1234567890"}"#.into()),
        };
        assert!(req.validate().is_ok());
    }

    #[test]
    fn test_create_form_submission_empty_email_fails() {
        let req = CreateFormSubmission {
            sender_email: "   ".into(),
            ..Default::default()
        };
        let err = req.validate().unwrap_err();
        match err {
            AppError::BadRequest(msg) => assert!(msg.contains("Sender email is required")),
            _ => panic!("Expected BadRequest"),
        }
    }

    #[test]
    fn test_create_form_submission_invalid_email_format() {
        let invalid_emails = [
            "plainaddress",
            "@missinglocal.com",
            "missingdomain@",
            "missingdot@domain",
            "trailingdot@domain.",
            "spaces in@domain.com",
        ];

        for email in invalid_emails {
            let req = CreateFormSubmission {
                sender_email: email.into(),
                ..Default::default()
            };
            assert!(
                req.validate().is_err(),
                "Expected {} to fail email validation",
                email
            );
        }
    }

    #[test]
    fn test_create_form_submission_newline_injection_fails() {
        let req_email = CreateFormSubmission {
            sender_email: "test@example.com\nBcc: spam@bad.com".into(),
            ..Default::default()
        };
        assert!(req_email.validate().is_err());

        let req_name = CreateFormSubmission {
            sender_email: "valid@example.com".into(),
            sender_name: Some("Jane\r\nDoe".into()),
            ..Default::default()
        };
        assert!(req_name.validate().is_err());

        let req_subj = CreateFormSubmission {
            sender_email: "valid@example.com".into(),
            subject: Some("Subject\nInjection".into()),
            ..Default::default()
        };
        assert!(req_subj.validate().is_err());
    }

    #[test]
    fn test_create_form_submission_length_limits() {
        let req_email_too_long = CreateFormSubmission {
            sender_email: format!("{}@example.com", "a".repeat(250)),
            ..Default::default()
        };
        assert!(req_email_too_long.validate().is_err());

        let req_name_too_long = CreateFormSubmission {
            sender_email: "test@example.com".into(),
            sender_name: Some("a".repeat(MAX_NAME_LEN + 1)),
            ..Default::default()
        };
        assert!(req_name_too_long.validate().is_err());

        let req_subj_too_long = CreateFormSubmission {
            sender_email: "test@example.com".into(),
            subject: Some("a".repeat(MAX_SUBJECT_LEN + 1)),
            ..Default::default()
        };
        assert!(req_subj_too_long.validate().is_err());

        let req_msg_too_long = CreateFormSubmission {
            sender_email: "test@example.com".into(),
            message: Some("a".repeat(MAX_MESSAGE_LEN + 1)),
            ..Default::default()
        };
        assert!(req_msg_too_long.validate().is_err());

        let req_meta_too_long = CreateFormSubmission {
            sender_email: "test@example.com".into(),
            metadata_json: Some(format!("{{\"key\":\"{}\"}}", "a".repeat(MAX_METADATA_LEN))),
            ..Default::default()
        };
        assert!(req_meta_too_long.validate().is_err());
    }

    #[test]
    fn test_create_form_submission_invalid_metadata_json() {
        let req = CreateFormSubmission {
            sender_email: "test@example.com".into(),
            metadata_json: Some("not json".into()),
            ..Default::default()
        };
        let err = req.validate().unwrap_err();
        match err {
            AppError::BadRequest(msg) => assert!(msg.contains("Metadata must be valid JSON")),
            _ => panic!("Expected BadRequest"),
        }
    }

    #[test]
    fn test_update_form_submission_status_validation() {
        for valid in ["unread", "read", "archived"] {
            let u = UpdateFormSubmissionStatus {
                status: valid.into(),
            };
            assert!(u.validate().is_ok());
        }

        let invalid = UpdateFormSubmissionStatus {
            status: "deleted".into(),
        };
        assert!(invalid.validate().is_err());
    }

    #[test]
    fn test_submission_stats_defaults() {
        let stats = SubmissionStats::default();
        assert_eq!(stats.unread_count, 0);
        assert_eq!(stats.read_count, 0);
        assert_eq!(stats.archived_count, 0);
        assert_eq!(stats.total_count, 0);

        let json = r#"{"unread_count": 5, "read_count": 4, "archived_count": 3, "total_count": 12}"#;
        let s: SubmissionStats = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(s.unread_count, 5);
        assert_eq!(s.read_count, 4);
        assert_eq!(s.archived_count, 3);
        assert_eq!(s.total_count, 12);
    }

    #[test]
    fn test_contact_form_preset_template_validation() {
        let schema = r#"[
            {"name":"heading","type":"text","label":"Heading","required":true},
            {"name":"subheading","type":"textarea","label":"Subheading","required":false},
            {"name":"submit_label","type":"text","label":"Submit Button Label","required":true},
            {"name":"success_message","type":"text","label":"Success Message","required":false},
            {"name":"show_subject","type":"boolean","label":"Show Subject Field","required":false},
            {"name":"show_phone","type":"boolean","label":"Show Phone Field","required":false}
        ]"#;

        let html = r#"<section class="section-contact-form">
  <div class="contact-form-container">
    <div class="contact-form-card">
      <div class="contact-form-header">
        {% if heading %}<h2 class="contact-form-headline">{{ heading }}</h2>{% endif %}
        {% if subheading %}<p class="contact-form-subheadline">{{ subheading }}</p>{% endif %}
      </div>
      <form class="contact-form" action="/forms/submit" method="POST">
        <input type="hidden" name="form_name" value="contact">
        <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
          <input type="text" name="website" tabindex="-1" autocomplete="new-password">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-name" class="contact-form-label">Name</label>
          <input type="text" id="contact-sender-name" name="sender_name" class="contact-form-input" placeholder="Your name">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-email" class="contact-form-label">Email <span class="required-mark">*</span></label>
          <input type="email" id="contact-sender-email" name="sender_email" class="contact-form-input" required placeholder="your.email@example.com">
        </div>
        {% if show_phone %}
        <div class="contact-form-group">
          <label for="contact-phone" class="contact-form-label">Phone</label>
          <input type="tel" id="contact-phone" name="phone" class="contact-form-input" placeholder="+1 (555) 000-0000">
        </div>
        {% endif %}
        {% if show_subject %}
        <div class="contact-form-group">
          <label for="contact-subject" class="contact-form-label">Subject</label>
          <input type="text" id="contact-subject" name="subject" class="contact-form-input" placeholder="How can we help?">
        </div>
        {% endif %}
        <div class="contact-form-group">
          <label for="contact-message" class="contact-form-label">Message <span class="required-mark">*</span></label>
          <textarea id="contact-message" name="message" class="contact-form-textarea" rows="5" required placeholder="Write your message here..."></textarea>
        </div>
        <div class="contact-form-error zygo-form-error" style="display: none;" role="alert" aria-live="assertive"></div>
        <div class="contact-form-actions">
          <button type="submit" class="contact-form-btn">{{ submit_label }}</button>
        </div>
        <div class="contact-form-status zygo-form-status" style="display: none;" role="status" aria-live="polite">
          <div class="zygo-form-status-icon" aria-hidden="true">&#10003;</div>
          <p>{% if success_message %}{{ success_message }}{% else %}Thank you for your submission.{% endif %}</p>
        </div>
      </form>
    </div>
  </div>
</section>"#;

        let res = crate::template_validation::validate_template_json(html, schema);
        assert!(res.is_valid, "Validation failed: {:?}", res.errors);
        assert!(res.errors.is_empty(), "Unexpected errors: {:?}", res.errors);
    }

    #[test]
    fn test_newsletter_preset_template_validation() {
        let schema = r#"[
            {"name":"heading","type":"text","label":"Heading","required":true},
            {"name":"subheading","type":"textarea","label":"Subheading","required":false},
            {"name":"submit_label","type":"text","label":"Button Label","required":true},
            {"name":"success_message","type":"text","label":"Success Message","required":false}
        ]"#;

        let html = r#"<section class="section-newsletter">
  <div class="newsletter-container">
    <div class="newsletter-header">
      {% if heading %}<h2 class="newsletter-headline">{{ heading }}</h2>{% endif %}
      {% if subheading %}<p class="newsletter-subheadline">{{ subheading }}</p>{% endif %}
    </div>
    <form class="newsletter-form" action="/forms/submit" method="POST">
      <input type="hidden" name="form_name" value="newsletter">
      <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
        <input type="text" name="website" tabindex="-1" autocomplete="new-password">
      </div>
      <div class="newsletter-input-group">
        <label for="newsletter-email" class="newsletter-sr-only">Email address</label>
        <input type="email" id="newsletter-email" name="sender_email" class="newsletter-input" required placeholder="Enter your email address">
        <button type="submit" class="newsletter-btn">{{ submit_label }}</button>
      </div>
      <div class="newsletter-error zygo-form-error" style="display: none;" role="alert" aria-live="assertive"></div>
      <div class="newsletter-status zygo-form-status" style="display: none;" role="status" aria-live="polite">
        <div class="zygo-form-status-icon" aria-hidden="true">&#10003;</div>
        <p>{% if success_message %}{{ success_message }}{% else %}Thank you for subscribing!{% endif %}</p>
      </div>
    </form>
  </div>
</section>"#;

        let res = crate::template_validation::validate_template_json(html, schema);
        assert!(res.is_valid, "Validation failed: {:?}", res.errors);
        assert!(res.errors.is_empty(), "Unexpected errors: {:?}", res.errors);
    }
}
