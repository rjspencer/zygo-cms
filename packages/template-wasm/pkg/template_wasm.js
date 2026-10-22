/* @ts-self-types="./template_wasm.d.ts" */
import { state } from './snippets/worker-b18bf6abe0db080b/inline0.js';


export class ContainerStartupOptions {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ContainerStartupOptionsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_containerstartupoptions_free(ptr, 0);

    }
    /**
     * @returns {boolean | undefined}
     */
    get enableInternet() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_containerstartupoptions_enableInternet(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * @returns {string[]}
     */
    get entrypoint() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_containerstartupoptions_entrypoint(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Map<any, any>}
     */
    get env() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_containerstartupoptions_env(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {boolean | null} [arg0]
     */
    set enableInternet(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_containerstartupoptions_enableInternet(this.__wbg_ptr, isLikeNone(arg0) ? 0xFFFFFF : arg0 ? 1 : 0);
    }
    /**
     * @param {string[]} arg0
     */
    set entrypoint(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        __wbg_call_guard();
        wasm.__wbg_set_containerstartupoptions_entrypoint(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Map<any, any>} arg0
     */
    set env(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_containerstartupoptions_env(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) ContainerStartupOptions.prototype[Symbol.dispose] = ContainerStartupOptions.prototype.free;

export class IntoUnderlyingByteSource {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingByteSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_intounderlyingbytesource_free(ptr, 0);

    }
    /**
     * @returns {number}
     */
    get autoAllocateChunkSize() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    cancel() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.intounderlyingbytesource_cancel(ptr);
    }
    /**
     * @param {ReadableByteStreamController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingbytesource_pull(this.__wbg_ptr, controller);
        return ret;
    }
    /**
     * @param {ReadableByteStreamController} controller
     */
    start(controller) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.intounderlyingbytesource_start(this.__wbg_ptr, controller);
    }
    /**
     * @returns {ReadableStreamType}
     */
    get type() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingbytesource_type(this.__wbg_ptr);
        return __wbindgen_enum_ReadableStreamType[ret];
    }
}
if (Symbol.dispose) IntoUnderlyingByteSource.prototype[Symbol.dispose] = IntoUnderlyingByteSource.prototype.free;

export class IntoUnderlyingSink {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSinkFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_intounderlyingsink_free(ptr, 0);

    }
    /**
     * @param {any} reason
     * @returns {Promise<any>}
     */
    abort(reason) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        const ptr = this.__destroy_into_raw();
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingsink_abort(ptr, reason);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    close() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        const ptr = this.__destroy_into_raw();
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingsink_close(ptr);
        return ret;
    }
    /**
     * @param {any} chunk
     * @returns {Promise<any>}
     */
    write(chunk) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingsink_write(this.__wbg_ptr, chunk);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSink.prototype[Symbol.dispose] = IntoUnderlyingSink.prototype.free;

export class IntoUnderlyingSource {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_intounderlyingsource_free(ptr, 0);

    }
    cancel() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.intounderlyingsource_cancel(ptr);
    }
    /**
     * @param {ReadableStreamDefaultController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.intounderlyingsource_pull(this.__wbg_ptr, controller);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSource.prototype[Symbol.dispose] = IntoUnderlyingSource.prototype.free;

/**
 * Configuration options for Cloudflare's minification features:
 * <https://www.cloudflare.com/website-optimization/>
 */
export class MinifyConfig {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MinifyConfigFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_minifyconfig_free(ptr, 0);

    }
    /**
     * @returns {boolean}
     */
    get css() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_minifyconfig_css(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get html() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_minifyconfig_html(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get js() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_minifyconfig_js(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set css(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_minifyconfig_css(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean} arg0
     */
    set html(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_minifyconfig_html(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean} arg0
     */
    set js(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_minifyconfig_js(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) MinifyConfig.prototype[Symbol.dispose] = MinifyConfig.prototype.free;

export class R2Range {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        R2RangeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        __wbg_call_guard();
        wasm.__wbg_r2range_free(ptr, 0);

    }
    /**
     * @returns {number | undefined}
     */
    get length() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_r2range_length(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @returns {number | undefined}
     */
    get offset() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_r2range_offset(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @returns {number | undefined}
     */
    get suffix() {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        let ret;
        __wbg_call_guard();
        ret = wasm.__wbg_get_r2range_suffix(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {number | null} [arg0]
     */
    set length(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_r2range_length(this.__wbg_ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
     * @param {number | null} [arg0]
     */
    set offset(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_r2range_offset(this.__wbg_ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
     * @param {number | null} [arg0]
     */
    set suffix(arg0) {
        if (this.__wbg_inst !== undefined && this.__wbg_inst !== __wbg_instance_id) {
            throw new Error('Invalid stale object from previous Wasm instance');
        }
        __wbg_call_guard();
        wasm.__wbg_set_r2range_suffix(this.__wbg_ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
}
if (Symbol.dispose) R2Range.prototype[Symbol.dispose] = R2Range.prototype.free;

function __wbg_reset_state () {
    __wbg_instance_id++;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    if (typeof numBytesDecoded !== 'undefined') numBytesDecoded = 0;
    if (typeof WASM_VECTOR_LEN !== 'undefined') WASM_VECTOR_LEN = 0;
    __wbg_reinit_scheduled = false;
    wasmInstance = new WebAssembly.Instance(wasmModule, __wbg_get_imports());
    wasm = wasmInstance.exports;
    wasm.__wbindgen_start();
}

/**
 * @returns {any}
 */
export function __worker_init_state() {
    let ret;
    __wbg_call_guard();
    ret = wasm.__worker_init_state();
    return ret;
}

export function init() {
    __wbg_call_guard();
    wasm.init();
}

/**
 * @param {string} html
 * @param {string} dummy_data_json
 * @returns {string}
 */
export function render_template(html, dummy_data_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(html, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(dummy_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        let ret;
        __wbg_call_guard();
        ret = wasm.render_template(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        __wbg_call_guard();
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_function_fcda5e3902d732fe: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_undefined_8c687d0b90d5b524: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_reinit_0256f5d04898665d: function() {
            __wbg_reinit_scheduled = true;
        },
        __wbg___wbindgen_string_get_92ab86bb19cbc12f: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_5d9e815e6fdf150f: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_997e73d32238e655: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_buffer_4a989bded7035f57: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_byobRequest_f161fc37241dd3d4: function(arg0) {
            const ret = arg0.byobRequest;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_byteLength_0ddb1795e2c7e689: function(arg0) {
            const ret = arg0.byteLength;
            return ret;
        },
        __wbg_byteOffset_46eb015f52b6ad7d: function(arg0) {
            const ret = arg0.byteOffset;
            return ret;
        },
        __wbg_call_6bcf8d3e20937e46: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_close_22882088c136df25: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_close_8b609460dd26e367: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_enqueue_6cb545d22db14f33: function() { return handleError(function (arg0, arg1) {
            arg0.enqueue(arg1);
        }, arguments); },
        __wbg_error_b7e73e671a58a488: function(arg0, arg1) {
            console.error(arg0, arg1);
        },
        __wbg_instanceId_27a130234331eb08: function(arg0) {
            const ret = arg0.instanceId;
            return ret;
        },
        __wbg_length_31bdaf014f5fbde2: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_a32a1ab6c6655abe: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_6f8b0d724fe26c07: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_byte_offset_and_length_492c969e8b5da8a4: function(arg0, arg1, arg2) {
            const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_queueMicrotask_85c90f6987555d65: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_f6a1fa10b81d1fc0: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_resolve_35ec7e0c6af4c82c: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_respond_83a71686e927ca32: function() { return handleError(function (arg0, arg1) {
            arg0.respond(arg1 >>> 0);
        }, arguments); },
        __wbg_set_5f2ad37e5e02dc7b: function(arg0, arg1, arg2) {
            arg0.set(getArrayU8FromWasm0(arg1, arg2));
        },
        __wbg_set_criticalError_0d391f2a45c3bc42: function(arg0, arg1) {
            arg0.criticalError = arg1 !== 0;
        },
        __wbg_set_instanceId_9b3420954adec865: function(arg0, arg1) {
            arg0.instanceId = arg1 >>> 0;
        },
        __wbg_static_accessor_GLOBAL_8eb4cd83130a11a0: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_1e7044f654e934db: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_INIT_STATE_35966a05809b7176: function() {
            const ret = state;
            return ret;
        },
        __wbg_static_accessor_SELF_d8b50611246a6d92: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_fd0bc376bf0f8b42: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_then_b830475380919203: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_view_d8c7b26e4d4650f1: function(arg0) {
            const ret = arg0.view;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 72, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___wasm_bindgen_385824b4d50ae6db___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_385824b4d50ae6db___JsError___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./template_wasm_bg.js": import0,
    };
}

function __wbg_call_guard() {
    if (__wbg_reinit_scheduled) {
        __wbg_reset_state();
        return;
    }
}
function wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___wasm_bindgen_385824b4d50ae6db___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_385824b4d50ae6db___JsError___true_(arg0, arg1, arg2) {
    let ret;
    __wbg_call_guard();
    ret = wasm.wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___wasm_bindgen_385824b4d50ae6db___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_385824b4d50ae6db___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    __wbg_call_guard();
    wasm.wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_ReadableStreamType = ["bytes"];


let __wbg_instance_id = 0;
const ContainerStartupOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_containerstartupoptions_free(ptr, 1);
});
const IntoUnderlyingByteSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_intounderlyingbytesource_free(ptr, 1);
});
const IntoUnderlyingSinkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_intounderlyingsink_free(ptr, 1);
});
const IntoUnderlyingSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_intounderlyingsource_free(ptr, 1);
});
const MinifyConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_minifyconfig_free(ptr, 1);
});
const R2RangeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(({ ptr, instance }) => {
    if (instance === __wbg_instance_id) wasm.__wbg_r2range_free(ptr, 1);
});

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    if (state.instance === __wbg_instance_id) {
        wasm.__wbindgen_destroy_closure(state.a, state.b);
    }
});

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1, instance: __wbg_instance_id };
    const real = (...args) => {

        if (state.instance !== __wbg_instance_id) {
            throw new Error('Cannot invoke closure from previous WASM instance');
        }

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let __wbg_reinit_scheduled = false;

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('template_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
