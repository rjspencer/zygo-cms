/* tslint:disable */
/* eslint-disable */
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */

export type ReadableStreamType = "bytes";

export class ContainerStartupOptions {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    get enableInternet(): boolean | undefined;
    set enableInternet(value: boolean | null | undefined);
    entrypoint: string[];
    env: Map<any, any>;
}

export class IntoUnderlyingByteSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableByteStreamController): Promise<any>;
    start(controller: ReadableByteStreamController): void;
    readonly autoAllocateChunkSize: number;
    readonly type: ReadableStreamType;
}

export class IntoUnderlyingSink {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    abort(reason: any): Promise<any>;
    close(): Promise<any>;
    write(chunk: any): Promise<any>;
}

export class IntoUnderlyingSource {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    cancel(): void;
    pull(controller: ReadableStreamDefaultController): Promise<any>;
}

/**
 * Configuration options for Cloudflare's minification features:
 * <https://www.cloudflare.com/website-optimization/>
 */
export class MinifyConfig {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    css: boolean;
    html: boolean;
    js: boolean;
}

export class R2Range {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    get length(): number | undefined;
    set length(value: number | null | undefined);
    get offset(): number | undefined;
    set offset(value: number | null | undefined);
    get suffix(): number | undefined;
    set suffix(value: number | null | undefined);
}

declare function __wbg_reset_state(): void;

export function __worker_init_state(): any;

export function init(): void;

export function render_template(html: string, dummy_data_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_containerstartupoptions_free: (a: number, b: number) => void;
    readonly __wbg_get_containerstartupoptions_enableInternet: (a: number) => number;
    readonly __wbg_get_containerstartupoptions_entrypoint: (a: number) => [number, number];
    readonly __wbg_get_containerstartupoptions_env: (a: number) => any;
    readonly __wbg_get_minifyconfig_css: (a: number) => number;
    readonly __wbg_get_minifyconfig_html: (a: number) => number;
    readonly __wbg_get_minifyconfig_js: (a: number) => number;
    readonly __wbg_get_r2range_length: (a: number) => [number, number];
    readonly __wbg_get_r2range_offset: (a: number) => [number, number];
    readonly __wbg_get_r2range_suffix: (a: number) => [number, number];
    readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
    readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
    readonly __wbg_minifyconfig_free: (a: number, b: number) => void;
    readonly __wbg_r2range_free: (a: number, b: number) => void;
    readonly __wbg_set_containerstartupoptions_enableInternet: (a: number, b: number) => void;
    readonly __wbg_set_containerstartupoptions_entrypoint: (a: number, b: number, c: number) => void;
    readonly __wbg_set_containerstartupoptions_env: (a: number, b: any) => void;
    readonly __wbg_set_minifyconfig_css: (a: number, b: number) => void;
    readonly __wbg_set_minifyconfig_html: (a: number, b: number) => void;
    readonly __wbg_set_minifyconfig_js: (a: number, b: number) => void;
    readonly __wbg_set_r2range_length: (a: number, b: number, c: number) => void;
    readonly __wbg_set_r2range_offset: (a: number, b: number, c: number) => void;
    readonly __wbg_set_r2range_suffix: (a: number, b: number, c: number) => void;
    readonly __worker_init_state: () => any;
    readonly init: () => void;
    readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
    readonly intounderlyingbytesource_cancel: (a: number) => void;
    readonly intounderlyingbytesource_pull: (a: number, b: any) => any;
    readonly intounderlyingbytesource_start: (a: number, b: any) => void;
    readonly intounderlyingbytesource_type: (a: number) => number;
    readonly intounderlyingsink_abort: (a: number, b: any) => any;
    readonly intounderlyingsink_close: (a: number) => any;
    readonly intounderlyingsink_write: (a: number, b: any) => any;
    readonly intounderlyingsource_cancel: (a: number) => void;
    readonly intounderlyingsource_pull: (a: number, b: any) => any;
    readonly render_template: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined___js_sys_81c888188b3c8845___Function_fn_wasm_bindgen_385824b4d50ae6db___JsValue_____wasm_bindgen_385824b4d50ae6db___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_385824b4d50ae6db___convert__closures_____invoke___wasm_bindgen_385824b4d50ae6db___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_385824b4d50ae6db___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
