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

    let ctx: serde_json::Value = match serde_json::from_str(dummy_data_json) {
        Ok(c) => c,
        Err(e) => return format!("Invalid JSON context: {}", e),
    };

    match tmpl.render(ctx) {
        Ok(rendered) => rendered,
        Err(e) => format!("Render error: {}", e),
    }
}
