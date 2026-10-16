use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default, rename_all = "camelCase")]
pub struct ThemeTokens {
    pub font_url: String,
    pub font_headline: String,
    pub font_body: String,
    pub color_bg: String,
    pub color_text: String,
    pub color_text_muted: String,
    pub color_accent: String,
    pub color_surface: String,
    pub color_border: String,
    pub max_width: String,
    pub font_size_base: String,
    pub line_height_body: String,
    pub header_layout: String,
    pub header_border_style: String,
    pub header_title_size: String,
    pub header_nav_transform: String,
    pub header_padding: String,
    pub header_tagline: String,
    pub border_radius: String,
    pub box_shadow: String,
}

impl Default for ThemeTokens {
    fn default() -> Self {
        Self::modern_editorial()
    }
}

impl ThemeTokens {
    pub fn modern_editorial() -> Self {
        Self {
            font_url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap".to_string(),
            font_headline: "'Newsreader', Georgia, serif".to_string(),
            font_body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif".to_string(),
            color_bg: "#faf8f5".to_string(),
            color_text: "#1c1917".to_string(),
            color_text_muted: "#78716c".to_string(),
            color_accent: "#991b1b".to_string(),
            color_surface: "#ffffff".to_string(),
            color_border: "#e7e5e4".to_string(),
            max_width: "1920px".to_string(),
            font_size_base: "18px".to_string(),
            line_height_body: "1.75".to_string(),
            header_layout: "centered".to_string(),
            header_border_style: "double".to_string(),
            header_title_size: "2rem".to_string(),
            header_nav_transform: "uppercase".to_string(),
            header_padding: "1.75rem 2rem 1.25rem 2rem".to_string(),
            header_tagline: "An Editorial Review & Journal".to_string(),
            border_radius: "8px".to_string(),
            box_shadow: "0 4px 6px rgba(0, 0, 0, 0.1)".to_string(),
        }
    }

    pub fn bento_brutalism() -> Self {
        Self {
            font_url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap".to_string(),
            font_headline: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif".to_string(),
            font_body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif".to_string(),
            color_bg: "#f6f5f0".to_string(),
            color_text: "#0f172a".to_string(),
            color_text_muted: "#334155".to_string(),
            color_accent: "#007799".to_string(),
            color_surface: "#ffffff".to_string(),
            color_border: "#0f172a".to_string(),
            max_width: "1920px".to_string(),
            font_size_base: "17px".to_string(),
            line_height_body: "1.7".to_string(),
            header_layout: "split".to_string(),
            header_border_style: "solid".to_string(),
            header_title_size: "1.5rem".to_string(),
            header_nav_transform: "uppercase".to_string(),
            header_padding: "1.25rem 2rem".to_string(),
            header_tagline: "Specs, Dispatches & Agentic Systems".to_string(),
            border_radius: "0px".to_string(),
            box_shadow: "0 4px 6px rgba(0, 0, 0, 0.1)".to_string(),
        }
    }

    pub fn get_preset(name: &str) -> Option<Self> {
        match name {
            "Modern Editorial" => Some(Self::modern_editorial()),
            "Bento-Brutalism" => Some(Self::bento_brutalism()),
            _ => None,
        }
    }

    pub fn resolve_from_settings(settings: Option<&HashMap<String, String>>) -> Self {
        let settings = match settings {
            Some(s) => s,
            None => return Self::modern_editorial(),
        };

        let active_theme_name = settings
            .get("theme_active_name")
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("Modern Editorial");

        // 1. Check custom themes stored in theme_custom_themes JSON
        let mut base_tokens = if let Some(custom_raw) = settings.get("theme_custom_themes").filter(|s| !s.trim().is_empty()) {
            if let Ok(custom_list) = serde_json::from_str::<Vec<CustomThemeEntry>>(custom_raw) {
                custom_list
                    .into_iter()
                    .find(|entry| entry.name == active_theme_name)
                    .map(|entry| entry.tokens)
            } else {
                None
            }
        } else {
            None
        };

        // 2. If not found in custom themes, check built-in presets
        if base_tokens.is_none() {
            base_tokens = Self::get_preset(active_theme_name);
        }

        // 3. Fallback to Modern Editorial preset if name unknown
        let mut tokens = base_tokens.unwrap_or_else(Self::modern_editorial);

        // 4. Allow explicit individual token keys in settings to override values
        if let Some(v) = settings.get("theme_font_url").filter(|s| !s.trim().is_empty()) {
            tokens.font_url = v.to_string();
        }
        if let Some(v) = settings.get("theme_font_headline").filter(|s| !s.trim().is_empty()) {
            tokens.font_headline = v.to_string();
        }
        if let Some(v) = settings.get("theme_font_body").filter(|s| !s.trim().is_empty()) {
            tokens.font_body = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_bg").filter(|s| !s.trim().is_empty()) {
            tokens.color_bg = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_text").filter(|s| !s.trim().is_empty()) {
            tokens.color_text = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_text_muted").filter(|s| !s.trim().is_empty()) {
            tokens.color_text_muted = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_accent").filter(|s| !s.trim().is_empty()) {
            tokens.color_accent = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_surface").filter(|s| !s.trim().is_empty()) {
            tokens.color_surface = v.to_string();
        }
        if let Some(v) = settings.get("theme_color_border").filter(|s| !s.trim().is_empty()) {
            tokens.color_border = v.to_string();
        }
        if let Some(v) = settings.get("theme_max_width").filter(|s| !s.trim().is_empty()) {
            tokens.max_width = v.to_string();
        }
        if let Some(v) = settings.get("theme_font_size_base").filter(|s| !s.trim().is_empty()) {
            tokens.font_size_base = v.to_string();
        }
        if let Some(v) = settings.get("theme_line_height").filter(|s| !s.trim().is_empty()) {
            tokens.line_height_body = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_layout").filter(|s| !s.trim().is_empty()) {
            tokens.header_layout = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_border_style").filter(|s| !s.trim().is_empty()) {
            tokens.header_border_style = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_title_size").filter(|s| !s.trim().is_empty()) {
            tokens.header_title_size = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_nav_transform").filter(|s| !s.trim().is_empty()) {
            tokens.header_nav_transform = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_padding").filter(|s| !s.trim().is_empty()) {
            tokens.header_padding = v.to_string();
        }
        if let Some(v) = settings.get("theme_header_tagline").filter(|s| !s.trim().is_empty()) {
            tokens.header_tagline = v.to_string();
        }
        if let Some(v) = settings.get("theme_border_radius").filter(|s| !s.trim().is_empty()) {
            tokens.border_radius = v.to_string();
        }
        if let Some(v) = settings.get("theme_box_shadow").filter(|s| !s.trim().is_empty()) {
            tokens.box_shadow = v.to_string();
        }

        tokens
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default, rename_all = "camelCase")]
pub struct CustomThemeEntry {
    pub name: String,
    pub base_theme: String,
    pub tokens: ThemeTokens,
}

impl Default for CustomThemeEntry {
    fn default() -> Self {
        Self {
            name: "Modern Editorial Custom".to_string(),
            base_theme: "Modern Editorial".to_string(),
            tokens: ThemeTokens::modern_editorial(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_theme_is_modern_editorial() {
        let default_theme = ThemeTokens::default();
        assert_eq!(default_theme.color_accent, "#991b1b");
        assert_eq!(default_theme.header_layout, "centered");
    }

    #[test]
    fn test_bento_brutalism_preset() {
        let bento = ThemeTokens::bento_brutalism();
        assert_eq!(bento.color_accent, "#007799");
        assert_eq!(bento.header_layout, "split");
        assert_eq!(bento.font_headline, "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif");
    }

    #[test]
    fn test_resolve_from_settings_by_active_name() {
        let mut settings = HashMap::new();
        settings.insert("theme_active_name".to_string(), "Bento-Brutalism".to_string());

        let resolved = ThemeTokens::resolve_from_settings(Some(&settings));
        assert_eq!(resolved.color_accent, "#007799");
        assert_eq!(resolved.header_layout, "split");
    }

    #[test]
    fn test_resolve_from_settings_custom_theme() {
        let custom_entry = CustomThemeEntry {
            name: "Cyberpunk".to_string(),
            base_theme: "Bento-Brutalism".to_string(),
            tokens: ThemeTokens {
                color_accent: "#f59e0b".to_string(),
                ..ThemeTokens::bento_brutalism()
            },
        };
        let custom_json = serde_json::to_string(&vec![custom_entry]).unwrap();

        let mut settings = HashMap::new();
        settings.insert("theme_active_name".to_string(), "Cyberpunk".to_string());
        settings.insert("theme_custom_themes".to_string(), custom_json);

        let resolved = ThemeTokens::resolve_from_settings(Some(&settings));
        assert_eq!(resolved.color_accent, "#f59e0b");
        assert_eq!(resolved.header_layout, "split");
    }

    #[test]
    fn test_resolve_from_settings_token_override() {
        let mut settings = HashMap::new();
        settings.insert("theme_active_name".to_string(), "Bento-Brutalism".to_string());
        settings.insert("theme_color_accent".to_string(), "#10b981".to_string());

        let resolved = ThemeTokens::resolve_from_settings(Some(&settings));
        assert_eq!(resolved.color_accent, "#10b981");
        assert_eq!(resolved.header_layout, "split");
    }
}
