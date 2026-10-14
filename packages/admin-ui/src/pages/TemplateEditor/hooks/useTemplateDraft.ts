import { useState, useEffect } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import type { TemplateItem } from '../../TemplatesList';

export function useTemplateDraft({
  id,
  isNew,
  template,
  isLoadingTemplate,
  formId,
  formTemplateHtml,
  formTemplateCss,
  formSchemaJson,
  setFormTemplateHtml,
  setFormTemplateCss,
  setFormSchemaJson,
}: {
  id: string | undefined;
  isNew: boolean;
  template: TemplateItem | undefined;
  isLoadingTemplate: boolean;
  formId: string;
  formTemplateHtml: string;
  formTemplateCss: string;
  formSchemaJson: string;
  setFormTemplateHtml: (val: string) => void;
  setFormTemplateCss: (val: string) => void;
  setFormSchemaJson: (val: string) => void;
}) {
  const [hasDraft, setHasDraft] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Slow Debounce -> Auto-Save Draft
  const debouncedDraftHtml = useDebounce(formTemplateHtml, 2500);
  const debouncedDraftCss = useDebounce(formTemplateCss, 2500);
  const debouncedDraftSchema = useDebounce(formSchemaJson, 2500);

  // 3. Auto-Save Draft
  useEffect(() => {
    if (isLoadingTemplate) return;
    if (!formId && !isNew) return;

    // Prevent saving draft if unchanged from DB
    if (template) {
      if (
        formTemplateHtml === (template.template_html || '') &&
        formTemplateCss === (template.template_css || '') &&
        formSchemaJson === (template.schema_json || '[]')
      ) {
        return;
      }
    }

    const draftKey = `zygo_template_draft_${id || 'new'}`;
    const draftData = {
      template_html: debouncedDraftHtml,
      template_css: debouncedDraftCss,
      schema_json: debouncedDraftSchema,
      updated_at: new Date().toISOString(),
    };
    window.localStorage?.setItem(draftKey, JSON.stringify(draftData));
    setHasDraft(true);
  }, [
    debouncedDraftHtml,
    debouncedDraftCss,
    debouncedDraftSchema,
    id,
    isNew,
    isLoadingTemplate,
    template,
    formId,
    formTemplateHtml,
    formTemplateCss,
    formSchemaJson,
  ]);

  // 4. On Mount -> Load Draft
  useEffect(() => {
    const draftKey = `zygo_template_draft_${id || 'new'}`;
    const saved = window.localStorage?.getItem(draftKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setFormTemplateHtml(draft.template_html || '');
        setFormTemplateCss(draft.template_css || '');
        setFormSchemaJson(draft.schema_json || '[]');
        setHasDraft(true);
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, [id, setFormTemplateHtml, setFormTemplateCss, setFormSchemaJson]);

  const discardDraft = () => {
    const draftKey = `zygo_template_draft_${id || 'new'}`;
    window.localStorage?.removeItem(draftKey);
    setHasDraft(false);
    setIsDiscardModalOpen(false);

    if (template) {
      setFormTemplateHtml(template.template_html || '');
      setFormTemplateCss(template.template_css || '');
      setFormSchemaJson(template.schema_json || '[]');
    } else {
      setFormTemplateHtml('');
      setFormTemplateCss('');
      setFormSchemaJson('[]');
    }
  };

  const clearDraft = () => {
    const draftKey = `zygo_template_draft_${id || 'new'}`;
    window.localStorage?.removeItem(draftKey);
    setHasDraft(false);
  };

  return {
    hasDraft,
    isDiscardModalOpen,
    setIsDiscardModalOpen,
    discardDraft,
    clearDraft,
  };
}
