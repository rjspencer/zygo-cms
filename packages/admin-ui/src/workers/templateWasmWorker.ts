import init, { render_template } from 'template-wasm';

let initialized = false;

self.onmessage = async (e: MessageEvent) => {
  const data = e.data;
  try {
    if (!initialized) {
      await init();
      initialized = true;
    }

    if (data.type === 'batch') {
      const { items, id } = data;
      let combinedResult = '';
      for (const item of items) {
        try {
          combinedResult += render_template(item.html, item.dummyDataJson);
        } catch (err) {
          console.error("Wasm Batch Render Error:", err);
          combinedResult += `<div style="color:red; padding:10px; border:1px solid red;">Render error: ${String(err)}</div>`;
        }
      }
      self.postMessage({ id, result: combinedResult, success: true });
    } else {
      const { html, dummyDataJson, id } = data;
      const result = render_template(html, dummyDataJson);
      self.postMessage({ id, result, success: true });
    }
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error), success: false });
  }
};
