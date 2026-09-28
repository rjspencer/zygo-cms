use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuItem {
    pub title: String,
    pub url: String,
    pub target: String,
    #[serde(default)]
    pub children: Vec<MenuItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Menu {
    pub id: i64,
    pub name: String,
    pub items_json: String,
    pub created_at: String,
    pub updated_at: String,
}

impl Menu {
    pub fn parsed_items(&self) -> Vec<MenuItem> {
        serde_json::from_str(&self.items_json).unwrap_or_default()
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateMenuRequest {
    pub items_json: String,
}

pub fn render_menu_html(items: &[MenuItem], depth: usize) -> String {
    // Hard cap the recursion depth to 4 to prevent stack overflows
    // and visually broken deeply nested CSS layouts.
    if items.is_empty() || depth >= 4 {
        return String::new();
    }
    
    // We use a basic HTML builder. Askama is used for the main shell.
    let mut html = String::from(r#"<ul class="nav-menu">"#);
    for item in items {
        let title = item.title.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#x27;");
        let target = item.target.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#x27;");
        
        // Prevent javascript: XSS
        let mut url = item.url.trim().to_string();
        if !url.starts_with('/') && !url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with('#') && !url.starts_with("mailto:") {
            url = "/".to_string(); // Fallback for invalid URLs
        }
        let safe_url = url.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#x27;");
        
        html.push_str(&format!(
            r#"<li><a href="{}" target="{}">{}</a>"#,
            safe_url, target, title
        ));
        
        if !item.children.is_empty() {
            html.push_str(&render_menu_html(&item.children, depth + 1));
        }
        
        html.push_str("</li>");
    }
    html.push_str("</ul>");
    html
}
