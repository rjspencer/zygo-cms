import init, { render_template } from 'template-wasm';

let initialized = false;

self.onmessage = async (e: MessageEvent) => {
  const { html, dummyDataJson, id } = e.data;
  try {
    if (!initialized) {
      await init();
      initialized = true;
    }
    const result = render_template(html, dummyDataJson);
    self.postMessage({ id, result, success: true });
  } catch (error) {
    self.postMessage({ id, error: String(error), success: false });
  }
};
