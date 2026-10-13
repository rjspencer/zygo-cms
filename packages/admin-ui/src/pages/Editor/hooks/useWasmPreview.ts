import { useEffect, useRef, useState } from 'react';
import type { SectionInstance, SectionTemplate } from '../../../types/sectionTemplate';
import { useDebounce } from '../../../hooks/useDebounce';
import type { EntryType } from '../types';

interface UseWasmPreviewOptions {
  entryType: EntryType;
  title: string;
  content: string;
  sections: SectionInstance[];
  sectionTemplates: SectionTemplate[];
}

/** Renders the live preview through the Wasm template worker; returns the HTML and CSS for the iframe. */
export const useWasmPreview = ({ entryType, title, content, sections, sectionTemplates }: UseWasmPreviewOptions) => {
  const workerRef = useRef<Worker | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('../../../workers/templateWasmWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current.onmessage = (e) => {
        if (e.data.success) {
          setPreviewHtml(e.data.result);
        } else {
          console.error('Wasm Render Error:', e.data.error);
        }
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const debouncedContent = useDebounce(content, 200);
  const debouncedTitle = useDebounce(title, 200);
  const debouncedSections = useDebounce(sections, 200);

  useEffect(() => {
    if (!workerRef.current) return;

    if (entryType === 'page') {
      const templates = debouncedSections.map((sec) => sectionTemplates.find((t) => t.id === sec.type_id));
      setPreviewCss(templates.map((tpl) => tpl?.template_css || '').join('\n'));
      workerRef.current.postMessage({
        type: 'batch',
        items: debouncedSections.map((sec, i) => ({
          html: templates[i]?.template_html || '',
          dummyDataJson: JSON.stringify(sec.data || {}),
        })),
        id: 'preview',
      });
    } else {
      setPreviewCss('');
      workerRef.current.postMessage({
        type: 'single',
        html: `<h1>{{ title }}</h1><div class="post-content">{{ content|safe }}</div>`,
        dummyDataJson: JSON.stringify({ title: debouncedTitle, content: debouncedContent }),
        id: 'preview',
      });
    }
  }, [debouncedContent, debouncedTitle, debouncedSections, entryType, sectionTemplates]);

  return { previewHtml, previewCss };
};
