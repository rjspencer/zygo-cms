use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn deserialize_bool_lenient<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct BoolVisitor;

    impl<'de> serde::de::Visitor<'de> for BoolVisitor {
        type Value = bool;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a boolean, integer 0/1, or null")
        }

        fn visit_bool<E>(self, v: bool) -> std::result::Result<bool, E> {
            Ok(v)
        }

        fn visit_i64<E>(self, v: i64) -> std::result::Result<bool, E> {
            Ok(v != 0)
        }

        fn visit_u64<E>(self, v: u64) -> std::result::Result<bool, E> {
            Ok(v != 0)
        }

        fn visit_f64<E>(self, v: f64) -> std::result::Result<bool, E> {
            Ok(v != 0.0)
        }

        fn visit_none<E>(self) -> std::result::Result<bool, E> {
            Ok(false)
        }

        fn visit_unit<E>(self) -> std::result::Result<bool, E> {
            Ok(false)
        }
    }

    deserializer.deserialize_any(BoolVisitor)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tokens: ThemeTokens,
    #[serde(deserialize_with = "deserialize_bool_lenient")]
    pub is_locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: None,
            tokens: ThemeTokens::default(),
            is_locked: false,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct ThemeRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tokens_json: String,
    #[serde(deserialize_with = "deserialize_bool_lenient")]
    pub is_locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for ThemeRow {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: None,
            tokens_json: String::new(),
            is_locked: false,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }
}

impl From<ThemeRow> for Theme {
    fn from(row: ThemeRow) -> Self {
        let tokens = serde_json::from_str::<ThemeTokens>(&row.tokens_json).unwrap_or_default();
        Self {
            id: row.id,
            name: row.name,
            description: row.description,
            tokens,
            is_locked: row.is_locked,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl From<&Theme> for ThemeRow {
    fn from(theme: &Theme) -> Self {
        Self {
            id: theme.id.clone(),
            name: theme.name.clone(),
            description: theme.description.clone(),
            tokens_json: serde_json::to_string(&theme.tokens).unwrap_or_default(),
            is_locked: theme.is_locked,
            created_at: theme.created_at.clone(),
            updated_at: theme.updated_at.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct ThemePayload {
    pub id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub tokens: Option<ThemeTokens>,
    pub tokens_json: Option<String>,
    pub is_locked: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct CreateThemePayload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tokens: Option<ThemeTokens>,
    pub tokens_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct UpdateThemePayload {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tokens: Option<ThemeTokens>,
    pub tokens_json: Option<String>,
}

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
            header_tagline: "".to_string(),
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
            font_size_base: "16px".to_string(),
            line_height_body: "1.5".to_string(),
            header_layout: "split".to_string(),
            header_border_style: "solid".to_string(),
            header_title_size: "1.5rem".to_string(),
            header_nav_transform: "uppercase".to_string(),
            header_padding: "1.25rem 2rem".to_string(),
            header_tagline: "".to_string(),
            border_radius: "2px".to_string(),
            box_shadow: "4px 6px 0 #0f172a".to_string(),
        }
    }

    pub fn bento_brutalism_dark() -> Self {
        Self {
            font_url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap".to_string(),
            font_headline: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif".to_string(),
            font_body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif".to_string(),
            color_bg: "#0b0f19".to_string(),
            color_text: "#f8fafc".to_string(),
            color_text_muted: "#94a3b8".to_string(),
            color_accent: "#38bdf8".to_string(),
            color_surface: "#151d2f".to_string(),
            color_border: "#334155".to_string(),
            max_width: "1920px".to_string(),
            font_size_base: "16px".to_string(),
            line_height_body: "1.5".to_string(),
            header_layout: "split".to_string(),
            header_border_style: "solid".to_string(),
            header_title_size: "1.5rem".to_string(),
            header_nav_transform: "uppercase".to_string(),
            header_padding: "1.25rem 2rem".to_string(),
            header_tagline: "".to_string(),
            border_radius: "2px".to_string(),
            box_shadow: "4px 6px 0 #000000".to_string(),
        }
    }

    pub fn get_preset(name: &str) -> Option<Self> {
        match name {
            "Modern Editorial" | "modern-editorial" => Some(Self::modern_editorial()),
            "Bento-Brutalism" | "bento-brutalism" => Some(Self::bento_brutalism()),
            "Bento-Brutalism (Dark)" | "Bento-Brutalism Dark" | "bento-brutalism-dark" => {
                Some(Self::bento_brutalism_dark())
            }
            _ => None,
        }
    }

    pub fn resolve_theme_tokens(
        identifier: &str,
        settings: Option<&HashMap<String, String>>,
    ) -> Option<Self> {
        // 1. Check presets (by name or ID)
        if let Some(tokens) = Self::get_preset(identifier) {
            return Some(tokens);
        }

        // 2. Check custom themes stored in theme_custom_themes JSON
        if let Some(settings) = settings {
            if let Some(custom_raw) = settings
                .get("theme_custom_themes")
                .filter(|s| !s.trim().is_empty())
            {
                if let Ok(custom_list) = serde_json::from_str::<Vec<CustomThemeEntry>>(custom_raw) {
                    if let Some(entry) = custom_list.into_iter().find(|entry| entry.name == identifier) {
                        return Some(entry.tokens);
                    }
                }
            }
        }

        None
    }

    pub fn resolve_from_settings(settings: Option<&HashMap<String, String>>) -> Self {
        let settings = match settings {
            Some(s) => s,
            None => return Self::modern_editorial(),
        };

        let active_theme_identifier = settings
            .get("theme_primary_id")
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .or_else(|| {
                settings
                    .get("theme_active_name")
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
            })
            .unwrap_or("modern-editorial");

        // 1. Check custom themes and presets
        let base_tokens = Self::resolve_theme_tokens(active_theme_identifier, Some(settings));

        // 2. Fallback to Modern Editorial preset if identifier unknown
        let mut tokens = base_tokens.unwrap_or_else(Self::modern_editorial);

        // 3. Allow explicit individual token keys in settings to override values
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
        assert_eq!(bento.font_size_base, "16px");
        assert_eq!(bento.line_height_body, "1.5");
        assert_eq!(bento.border_radius, "2px");
        assert_eq!(bento.box_shadow, "4px 6px 0 #0f172a");
    }

    #[test]
    fn test_bento_brutalism_dark_preset() {
        let dark = ThemeTokens::bento_brutalism_dark();
        assert_eq!(dark.color_bg, "#0b0f19");
        assert_eq!(dark.color_surface, "#151d2f");
        assert_eq!(dark.color_text, "#f8fafc");
        assert_eq!(dark.color_text_muted, "#94a3b8");
        assert_eq!(dark.color_accent, "#38bdf8");
        assert_eq!(dark.color_border, "#334155");
        assert_eq!(dark.box_shadow, "4px 6px 0 #000000");
        assert_eq!(dark.border_radius, "2px");
        assert_eq!(dark.header_layout, "split");

        // Assert get_preset matches both formatted name and alias
        assert_eq!(ThemeTokens::get_preset("Bento-Brutalism (Dark)").unwrap(), dark);
        assert_eq!(ThemeTokens::get_preset("Bento-Brutalism Dark").unwrap(), dark);
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

    #[test]
    fn test_theme_and_theme_row_defaults() {
        let theme = Theme::default();
        assert_eq!(theme.id, "");
        assert_eq!(theme.name, "");
        assert_eq!(theme.description, None);
        assert_eq!(theme.tokens, ThemeTokens::default());
        assert!(!theme.is_locked);

        let row = ThemeRow::default();
        assert_eq!(row.id, "");
        assert_eq!(row.tokens_json, "");
        assert!(!row.is_locked);
    }

    #[test]
    fn test_theme_row_to_theme_conversion() {
        let tokens = ThemeTokens::bento_brutalism();
        let tokens_json = serde_json::to_string(&tokens).unwrap();
        let row = ThemeRow {
            id: "bento-brutalism".to_string(),
            name: "Bento Brutalism".to_string(),
            description: Some("Brutalist style".to_string()),
            tokens_json,
            is_locked: true,
            created_at: "2026-10-24 12:00:00".to_string(),
            updated_at: "2026-10-24 12:00:00".to_string(),
        };

        let theme = Theme::from(row.clone());
        assert_eq!(theme.id, "bento-brutalism");
        assert_eq!(theme.name, "Bento Brutalism");
        assert_eq!(theme.description, Some("Brutalist style".to_string()));
        assert_eq!(theme.tokens, tokens);
        assert!(theme.is_locked);

        let roundtrip_row = ThemeRow::from(&theme);
        assert_eq!(roundtrip_row.id, row.id);
        assert_eq!(roundtrip_row.name, row.name);
        assert_eq!(roundtrip_row.tokens_json, row.tokens_json);
        assert_eq!(roundtrip_row.is_locked, row.is_locked);
    }

    #[test]
    fn test_theme_row_invalid_tokens_json_fallback() {
        let row = ThemeRow {
            id: "corrupted".to_string(),
            name: "Corrupted Theme".to_string(),
            description: None,
            tokens_json: "{ not valid json }".to_string(),
            is_locked: false,
            created_at: "2026-10-24 12:00:00".to_string(),
            updated_at: "2026-10-24 12:00:00".to_string(),
        };

        let theme = Theme::from(row);
        assert_eq!(theme.tokens, ThemeTokens::default());
    }

    #[test]
    fn test_theme_row_deserialize_sqlite_bool() {
        let json_1 = r#"{
            "id": "theme-1",
            "name": "Theme 1",
            "tokens_json": "{}",
            "is_locked": 1,
            "created_at": "2026-10-24 12:00:00",
            "updated_at": "2026-10-24 12:00:00"
        }"#;
        let parsed_1: ThemeRow = serde_json::from_str(json_1).unwrap();
        assert!(parsed_1.is_locked);

        let json_0 = r#"{
            "id": "theme-0",
            "name": "Theme 0",
            "tokens_json": "{}",
            "is_locked": 0,
            "created_at": "2026-10-24 12:00:00",
            "updated_at": "2026-10-24 12:00:00"
        }"#;
        let parsed_0: ThemeRow = serde_json::from_str(json_0).unwrap();
        assert!(!parsed_0.is_locked);

        let json_bool = r#"{
            "id": "theme-bool",
            "name": "Theme Bool",
            "tokens_json": "{}",
            "is_locked": true,
            "created_at": "2026-10-24 12:00:00",
            "updated_at": "2026-10-24 12:00:00"
        }"#;
        let parsed_bool: ThemeRow = serde_json::from_str(json_bool).unwrap();
        assert!(parsed_bool.is_locked);

        let json_null = r#"{
            "id": "theme-null",
            "name": "Theme Null",
            "tokens_json": "{}",
            "is_locked": null,
            "created_at": "2026-10-24 12:00:00",
            "updated_at": "2026-10-24 12:00:00"
        }"#;
        let parsed_null: ThemeRow = serde_json::from_str(json_null).unwrap();
        assert!(!parsed_null.is_locked);
    }

    #[test]
    fn test_theme_payload_serialization() {
        let payload = ThemePayload {
            id: Some("custom-theme".to_string()),
            name: Some("Custom Theme".to_string()),
            description: Some("A nice custom theme".to_string()),
            tokens: Some(ThemeTokens::modern_editorial()),
            tokens_json: None,
            is_locked: Some(false),
        };

        let json = serde_json::to_string(&payload).unwrap();
        let parsed: ThemePayload = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, payload);

        let create_payload = CreateThemePayload {
            id: "my-theme".to_string(),
            name: "My Theme".to_string(),
            description: Some("Desc".to_string()),
            tokens: Some(ThemeTokens::bento_brutalism()),
            tokens_json: None,
        };
        let c_json = serde_json::to_string(&create_payload).unwrap();
        let c_parsed: CreateThemePayload = serde_json::from_str(&c_json).unwrap();
        assert_eq!(c_parsed, create_payload);

        let update_payload = UpdateThemePayload {
            name: Some("Updated Name".to_string()),
            description: None,
            tokens: None,
            tokens_json: Some("{}".to_string()),
        };
        let u_json = serde_json::to_string(&update_payload).unwrap();
        let u_parsed: UpdateThemePayload = serde_json::from_str(&u_json).unwrap();
        assert_eq!(u_parsed, update_payload);
    }

    #[test]
    fn test_seed_json_parses_to_expected_presets() {
        let modern_sql_json = r##"{"fontUrl":"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap","fontHeadline":"'Newsreader', Georgia, serif","fontBody":"'Inter', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#faf8f5","colorText":"#1c1917","colorTextMuted":"#78716c","colorAccent":"#991b1b","colorSurface":"#ffffff","colorBorder":"#e7e5e4","maxWidth":"1920px","fontSizeBase":"18px","lineHeightBody":"1.75","headerLayout":"centered","headerBorderStyle":"double","headerTitleSize":"2rem","headerNavTransform":"uppercase","headerPadding":"1.75rem 2rem 1.25rem 2rem","headerTagline":"","borderRadius":"8px","boxShadow":"0 4px 6px rgba(0, 0, 0, 0.1)"}"##;
        let modern_tokens: ThemeTokens = serde_json::from_str(modern_sql_json).unwrap();
        assert_eq!(modern_tokens, ThemeTokens::modern_editorial());

        let bento_sql_json = r##"{"fontUrl":"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap","fontHeadline":"'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif","fontBody":"'Inter', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#f6f5f0","colorText":"#0f172a","colorTextMuted":"#334155","colorAccent":"#007799","colorSurface":"#ffffff","colorBorder":"#0f172a","maxWidth":"1920px","fontSizeBase":"16px","lineHeightBody":"1.5","headerLayout":"split","headerBorderStyle":"solid","headerTitleSize":"1.5rem","headerNavTransform":"uppercase","headerPadding":"1.25rem 2rem","headerTagline":"","borderRadius":"2px","boxShadow":"4px 6px 0 #0f172a"}"##;
        let bento_tokens: ThemeTokens = serde_json::from_str(bento_sql_json).unwrap();
        assert_eq!(bento_tokens, ThemeTokens::bento_brutalism());

        let bento_dark_sql_json = r##"{"fontUrl":"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap","fontHeadline":"'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif","fontBody":"'Inter', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#0b0f19","colorText":"#f8fafc","colorTextMuted":"#94a3b8","colorAccent":"#38bdf8","colorSurface":"#151d2f","colorBorder":"#334155","maxWidth":"1920px","fontSizeBase":"16px","lineHeightBody":"1.5","headerLayout":"split","headerBorderStyle":"solid","headerTitleSize":"1.5rem","headerNavTransform":"uppercase","headerPadding":"1.25rem 2rem","headerTagline":"","borderRadius":"2px","boxShadow":"4px 6px 0 #000000"}"##;
        let bento_dark_tokens: ThemeTokens = serde_json::from_str(bento_dark_sql_json).unwrap();
        assert_eq!(bento_dark_tokens, ThemeTokens::bento_brutalism_dark());
    }
}
