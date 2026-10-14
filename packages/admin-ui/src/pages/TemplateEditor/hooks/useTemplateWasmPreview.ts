import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import { generateDummyDataFromSchema } from '../../../utils/dummyData';

export function useTemplateWasmPreview(
  formId: string,
  formTemplateHtml: string,
  formSchemaJson: string,
) {
  const workerRef = useRef<Worker | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isCompilingWasm, setIsCompilingWasm] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Debounced values for fast preview update
  const debouncedWasmHtml = useDebounce(formTemplateHtml, 200);
  const debouncedWasmSchema = useDebounce(formSchemaJson, 200);

  const isPendingDebounce =
    formTemplateHtml !== debouncedWasmHtml || formSchemaJson !== debouncedWasmSchema;
  const isStatusCompiling = isPendingDebounce || isCompilingWasm;

  // 1. Initialize Web Worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(
        new URL('../../../workers/templateWasmWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e) => {
        if (e.data.success) {
          setPreviewHtml(e.data.result);
        } else {
          console.error('Wasm Render Error:', e.data.error);
        }
        setIsCompilingWasm(false);
        setRenderCount((prev) => prev + 1);
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 2. Fast Debounce -> Trigger Wasm Preview
  useEffect(() => {
    if (workerRef.current) {
      setIsCompilingWasm(true);
      const dummyData = generateDummyDataFromSchema(debouncedWasmSchema);
      workerRef.current.postMessage({
        html: debouncedWasmHtml,
        dummyDataJson: dummyData,
        id: formId || 'preview',
      });
    }
  }, [debouncedWasmHtml, debouncedWasmSchema, formId]);

  return {
    previewHtml,
    isStatusCompiling,
    renderCount,
    debouncedWasmHtml,
  };
}
