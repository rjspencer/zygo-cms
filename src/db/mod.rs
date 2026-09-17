pub mod entry;

pub use entry::*;

use worker::wasm_bindgen::JsValue;

pub(crate) fn opt_js(val: &Option<String>) -> JsValue {
    val.as_deref()
        .map(JsValue::from)
        .unwrap_or_else(JsValue::null)
}
