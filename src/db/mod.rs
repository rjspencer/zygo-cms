pub mod entry;

pub use entry::*;

use worker::wasm_bindgen::JsValue;

pub(crate) fn opt_js(val: &Option<String>) -> JsValue {
    val.as_deref()
        .map(JsValue::from)
        .unwrap_or_else(JsValue::null)
}

pub(crate) fn opt_js_i64(val: &Option<i64>) -> JsValue {
    val.map(|v| JsValue::from(v as f64))
        .unwrap_or_else(JsValue::null)
}

pub(crate) fn opt_js_i32(val: &Option<i32>) -> JsValue {
    val.map(|v| JsValue::from(v as f64))
        .unwrap_or_else(JsValue::null)
}

