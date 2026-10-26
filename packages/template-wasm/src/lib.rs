use wasm_bindgen::prelude::*;
use minijinja::Environment;
use zygo_core::template_engine::configure_env;

#[wasm_bindgen]
pub fn render_template(html: &str, dummy_data_json: &str) -> String {
    let mut env = Environment::new();
    configure_env(&mut env);

    let tmpl = match env.template_from_str(html) {
        Ok(t) => t,
        Err(e) => return format!("Template error: {}", e),
    };

    let mut ctx: serde_json::Value = match serde_json::from_str(dummy_data_json) {
        Ok(c) => c,
        Err(e) => return format!("Invalid JSON context: {}", e),
    };

    if let serde_json::Value::Object(ref mut map) = ctx {
        map.insert(
            "analytics_site_tag".to_string(),
            serde_json::Value::String(String::new()),
        );
    }

    match tmpl.render(ctx) {
        Ok(rendered) => rendered,
        Err(e) => format!("Render error: {}", e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_template_suppresses_analytics_site_tag() {
        let template_html = r#"
            <head>
                {% if analytics_site_tag %}
                <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "{{ analytics_site_tag }}"}'></script>
                {% endif %}
            </head>
            <body>Hello {{ name }}</body>
        "#;

        let dummy_json = r#"{ "name": "World", "analytics_site_tag": "cf-token-999" }"#;
        let rendered = render_template(template_html, dummy_json);

        assert!(!rendered.contains("beacon.min.js"));
        assert!(!rendered.contains("cf-token-999"));
        assert!(rendered.contains("<body>Hello World</body>"));
    }
}
