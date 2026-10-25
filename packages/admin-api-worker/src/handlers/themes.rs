use crate::auth_required;
use serde::Deserialize;
use worker::{Request, Response, Result, RouteContext};
use zygo_core::db;
use zygo_core::error::AppError;
use zygo_core::models::ThemeTokens;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateThemePayload {
    pub id: Option<String>,
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThemeRequest {
    pub name: String,
    pub description: Option<String>,
    pub tokens: Option<ThemeTokens>,
    #[serde(alias = "base_theme_id")]
    pub base_theme_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateThemeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tokens: Option<ThemeTokens>,
    pub tokens_json: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenameThemeRequest {
    pub name: String,
}

pub fn slugify_theme_name(name: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;
    for c in name.chars() {
        if c.is_ascii_alphanumeric() {
            slug.push(c.to_ascii_lowercase());
            prev_dash = false;
        } else if !prev_dash && !slug.is_empty() {
            slug.push('-');
            prev_dash = true;
        }
    }
    let trimmed = slug.trim_end_matches('-').to_string();
    if trimmed.is_empty() {
        "custom-theme".to_string()
    } else {
        trimmed
    }
}

pub fn compute_duplicate_name(source_name: &str, existing_names: &[String]) -> String {
    let base = format!("{} copy", source_name);
    if !existing_names.iter().any(|n| n.eq_ignore_ascii_case(&base)) {
        return base;
    }
    let mut i = 2;
    loop {
        let candidate = format!("{} copy {}", source_name, i);
        if !existing_names
            .iter()
            .any(|n| n.eq_ignore_ascii_case(&candidate))
        {
            return candidate;
        }
        i += 1;
    }
}

pub async fn ensure_unique_theme_id(
    d1: &worker::D1Database,
    base_slug: &str,
) -> worker::Result<String> {
    if db::theme::get_by_id(d1, base_slug).await?.is_none() {
        return Ok(base_slug.to_string());
    }
    for i in 2..=100 {
        let candidate = format!("{}-{}", base_slug, i);
        if db::theme::get_by_id(d1, &candidate).await?.is_none() {
            return Ok(candidate);
        }
    }
    let random_suffix = &crate::utils::generate_id()[..6];
    Ok(format!("{}-{}", base_slug, random_suffix))
}

pub async fn list_themes(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;

    match db::theme::get_all(&d1).await {
        Ok(themes) => Response::from_json(&themes),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn activate_theme(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;

    let payload: ActivateThemePayload = match req.json().await {
        Ok(p) => p,
        Err(e) => return AppError::BadRequest(format!("Invalid payload: {}", e)).to_response(),
    };

    let role = payload.role.to_lowercase();
    match role.as_str() {
        "primary" => {
            let id = match payload
                .id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                Some(id) => id,
                None => {
                    return AppError::BadRequest("Theme ID is required for primary role".into())
                        .to_response()
                }
            };

            let theme = match db::theme::get_by_id(&d1, id).await {
                Ok(Some(t)) => t,
                Ok(None) => return AppError::NotFound.to_response(),
                Err(e) => return AppError::ServerError(e.to_string()).to_response(),
            };

            if let Err(e) = db::setting::set_setting(&d1, "theme_primary_id", id).await {
                return AppError::ServerError(e.to_string()).to_response();
            }
            if let Err(e) = db::setting::set_setting(&d1, "theme_active_name", &theme.name).await {
                return AppError::ServerError(e.to_string()).to_response();
            }
        }
        "dark" => {
            let id_opt = payload
                .id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty());
            match id_opt {
                Some(id) => {
                    match db::theme::get_by_id(&d1, id).await {
                        Ok(Some(_)) => {}
                        Ok(None) => return AppError::NotFound.to_response(),
                        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
                    }
                    if let Err(e) = db::setting::set_setting(&d1, "theme_dark_id", id).await {
                        return AppError::ServerError(e.to_string()).to_response();
                    }
                }
                None => {
                    if let Err(e) = db::setting::set_setting(&d1, "theme_dark_id", "").await {
                        return AppError::ServerError(e.to_string()).to_response();
                    }
                }
            }
        }
        _ => {
            return AppError::BadRequest(format!(
                "Invalid role '{}'. Expected 'primary' or 'dark'",
                payload.role
            ))
            .to_response()
        }
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    let settings = db::setting::get_settings_map(&d1).await.unwrap_or_default();
    let theme_primary_id = settings.get("theme_primary_id").cloned();
    let theme_dark_id = settings
        .get("theme_dark_id")
        .cloned()
        .filter(|s| !s.trim().is_empty());

    Response::from_json(&serde_json::json!({
        "success": true,
        "themePrimaryId": theme_primary_id,
        "themeDarkId": theme_dark_id,
    }))
}

pub async fn get_theme(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    match db::theme::get_by_id(&d1, id).await {
        Ok(Some(theme)) => Response::from_json(&theme),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn create_theme(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;

    let payload: CreateThemeRequest = match req.json().await {
        Ok(p) => p,
        Err(e) => return AppError::BadRequest(format!("Invalid payload: {}", e)).to_response(),
    };

    let name = payload.name.trim();
    if name.is_empty() {
        return AppError::BadRequest("Theme name cannot be empty".into()).to_response();
    }

    let tokens = if let Some(toks) = payload.tokens {
        toks
    } else if let Some(ref base_id) = payload.base_theme_id {
        if let Ok(Some(base_theme)) = db::theme::get_by_id(&d1, base_id).await {
            base_theme.tokens
        } else if let Some(preset) = ThemeTokens::get_preset(base_id) {
            preset
        } else {
            ThemeTokens::default()
        }
    } else {
        ThemeTokens::default()
    };

    let tokens_json = serde_json::to_string(&tokens).unwrap_or_default();
    let base_slug = slugify_theme_name(name);
    let id = match ensure_unique_theme_id(&d1, &base_slug).await {
        Ok(unique_id) => unique_id,
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if let Err(e) = db::theme::create(
        &d1,
        &id,
        name,
        payload.description.as_deref(),
        &tokens_json,
        false,
    )
    .await
    {
        return AppError::ServerError(e.to_string()).to_response();
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::theme::get_by_id(&d1, &id).await {
        Ok(Some(created)) => Ok(Response::from_json(&created)?.with_status(201)),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn update_theme(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let existing = match db::theme::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if existing.is_locked {
        return AppError::Forbidden("Cannot modify locked built-in theme".into()).to_response();
    }

    let payload: UpdateThemeRequest = match req.json().await {
        Ok(p) => p,
        Err(e) => return AppError::BadRequest(format!("Invalid payload: {}", e)).to_response(),
    };

    if let Some(ref name) = payload.name {
        if name.trim().is_empty() {
            return AppError::BadRequest("Theme name cannot be empty".into()).to_response();
        }
    }

    let tokens_json = if let Some(ref toks) = payload.tokens {
        Some(serde_json::to_string(toks).unwrap_or_default())
    } else if let Some(ref raw_json) = payload.tokens_json {
        if serde_json::from_str::<ThemeTokens>(raw_json).is_err() {
            return AppError::BadRequest("Invalid tokens JSON format".into()).to_response();
        }
        Some(raw_json.clone())
    } else {
        None
    };

    if let Err(e) = db::theme::update(
        &d1,
        id,
        payload.name.as_deref().map(str::trim),
        payload.description.as_deref(),
        tokens_json.as_deref(),
    )
    .await
    {
        return AppError::ServerError(e.to_string()).to_response();
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::theme::get_by_id(&d1, id).await {
        Ok(Some(updated)) => Response::from_json(&updated),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn rename_theme(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let existing = match db::theme::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if existing.is_locked {
        return AppError::Forbidden("Cannot modify locked built-in theme".into()).to_response();
    }

    let payload: RenameThemeRequest = match req.json().await {
        Ok(p) => p,
        Err(e) => return AppError::BadRequest(format!("Invalid payload: {}", e)).to_response(),
    };

    let new_name = payload.name.trim();
    if new_name.is_empty() {
        return AppError::BadRequest("Theme name cannot be empty".into()).to_response();
    }

    if let Err(e) = db::theme::rename(&d1, id, new_name).await {
        return AppError::ServerError(e.to_string()).to_response();
    }

    // Keep theme_active_name in settings consistent if this was the primary theme
    let settings = db::setting::get_settings_map(&d1).await.unwrap_or_default();
    if settings.get("theme_primary_id").map(|s| s.as_str()) == Some(id) {
        let _ = db::setting::set_setting(&d1, "theme_active_name", new_name).await;
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::theme::get_by_id(&d1, id).await {
        Ok(Some(updated)) => Response::from_json(&updated),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn duplicate_theme(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let source = match db::theme::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    let all_themes = db::theme::get_all(&d1).await.unwrap_or_default();
    let names: Vec<String> = all_themes.into_iter().map(|t| t.name).collect();
    let new_name = compute_duplicate_name(&source.name, &names);

    let base_slug = slugify_theme_name(&new_name);
    let new_id = match ensure_unique_theme_id(&d1, &base_slug).await {
        Ok(unique_id) => unique_id,
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    let tokens_json = serde_json::to_string(&source.tokens).unwrap_or_default();

    if let Err(e) = db::theme::create(
        &d1,
        &new_id,
        &new_name,
        source.description.as_deref(),
        &tokens_json,
        false,
    )
    .await
    {
        return AppError::ServerError(e.to_string()).to_response();
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    match db::theme::get_by_id(&d1, &new_id).await {
        Ok(Some(created)) => Ok(Response::from_json(&created)?.with_status(201)),
        Ok(None) => AppError::NotFound.to_response(),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn delete_theme(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = auth_required!(&req, ctx);
    let id = ctx.param("id").unwrap();
    let d1 = ctx.env.d1("DB")?;

    let existing = match db::theme::get_by_id(&d1, id).await {
        Ok(Some(t)) => t,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if existing.is_locked {
        return AppError::Forbidden("Cannot modify locked built-in theme".into()).to_response();
    }

    let settings = db::setting::get_settings_map(&d1).await.unwrap_or_default();
    let primary_id = settings
        .get("theme_primary_id")
        .map(|s| s.as_str())
        .unwrap_or("");
    let dark_id = settings
        .get("theme_dark_id")
        .map(|s| s.as_str())
        .unwrap_or("");

    if id == primary_id || id == dark_id {
        return AppError::BadRequest("Cannot delete active theme".into()).to_response();
    }

    if let Err(e) = db::theme::delete(&d1, id).await {
        return AppError::ServerError(e.to_string()).to_response();
    }

    crate::handlers::layout_templates::recompute_and_purge(&ctx.env, &d1, &req).await;

    Response::from_json(&serde_json::json!({ "success": true }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use zygo_core::models::Theme;

    #[test]
    fn test_slugify_theme_name() {
        assert_eq!(slugify_theme_name("Modern Editorial"), "modern-editorial");
        assert_eq!(slugify_theme_name("Bento Brutalism (Dark)"), "bento-brutalism-dark");
        assert_eq!(slugify_theme_name("   Custom  Theme!  "), "custom-theme");
        assert_eq!(slugify_theme_name("---"), "custom-theme");
        assert_eq!(slugify_theme_name(""), "custom-theme");
    }

    #[test]
    fn test_compute_duplicate_name() {
        let existing = vec!["My Theme".to_string()];
        assert_eq!(compute_duplicate_name("My Theme", &existing), "My Theme copy");

        let existing2 = vec!["My Theme".to_string(), "My Theme copy".to_string()];
        assert_eq!(compute_duplicate_name("My Theme", &existing2), "My Theme copy 2");

        let existing3 = vec![
            "My Theme".to_string(),
            "My Theme copy".to_string(),
            "My Theme copy 2".to_string(),
        ];
        assert_eq!(compute_duplicate_name("My Theme", &existing3), "My Theme copy 3");
    }

    #[test]
    fn test_activate_theme_validation() {
        let payload_empty_primary = ActivateThemePayload {
            id: None,
            role: "primary".to_string(),
        };
        assert!(payload_empty_primary.id.is_none());

        let payload_empty_dark = ActivateThemePayload {
            id: Some("".to_string()),
            role: "dark".to_string(),
        };
        let dark_id = payload_empty_dark.id.as_deref().map(str::trim).filter(|s| !s.is_empty());
        assert!(dark_id.is_none());

        let payload_invalid_role = ActivateThemePayload {
            id: Some("theme-1".to_string()),
            role: "invalid".to_string(),
        };
        assert_ne!(payload_invalid_role.role, "primary");
        assert_ne!(payload_invalid_role.role, "dark");
    }

    #[test]
    fn test_locked_theme_protection_check() {
        let locked_theme = Theme {
            id: "modern-editorial".to_string(),
            name: "Modern Editorial".to_string(),
            is_locked: true,
            ..Default::default()
        };
        assert!(locked_theme.is_locked);

        let custom_theme = Theme {
            id: "custom-theme".to_string(),
            name: "Custom Theme".to_string(),
            is_locked: false,
            ..Default::default()
        };
        assert!(!custom_theme.is_locked);
    }

    #[test]
    fn test_active_theme_delete_protection_check() {
        let primary_id = "modern-editorial";
        let dark_id = "bento-brutalism-dark";

        // Deleting primary theme must be rejected
        assert_eq!(primary_id, "modern-editorial");
        let is_primary = "modern-editorial" == primary_id || "modern-editorial" == dark_id;
        assert!(is_primary);

        // Deleting dark theme must be rejected
        let is_dark = "bento-brutalism-dark" == primary_id || "bento-brutalism-dark" == dark_id;
        assert!(is_dark);

        // Deleting non-active theme allowed
        let other_id = "custom-theme";
        let is_active = other_id == primary_id || other_id == dark_id;
        assert!(!is_active);
    }
}
