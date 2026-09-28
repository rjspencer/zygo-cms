use worker::*;

pub fn get_auth_url(_env: &Env) -> String {
    "/cdn-cgi/access/logout".to_string()
}

/// Resolves the canonical site origin.

#[cfg(target_arch = "wasm32")]
pub fn generate_preview_token() -> String {
    use worker::wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = crypto, js_name = randomUUID)]
        fn js_random_uuid() -> String;
    }

    js_random_uuid().replace('-', "")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn generate_preview_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("prev{:x}", nanos)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_preview_token_format() {
        let tok1 = generate_preview_token();
        let tok2 = generate_preview_token();
        assert!(!tok1.is_empty());
        assert!(!tok2.is_empty());
        assert_ne!(tok1, tok2);
    }
}

