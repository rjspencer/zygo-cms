import { useEffect } from 'react';
import type { SectionTemplateField } from '../../../types/sectionTemplate';
import { useTemplateEditorWebMCP } from '../../../lib/webmcp/templateTools';

export function useTemplateAgentBridge({
  formId,
  formName,
  formDescription,
  formTemplateHtml,
  formTemplateCss,
  formSchemaJson,
  isLocked,
  previewHtml,
  setActiveTab,
  setFormTemplateHtml,
  setFormTemplateCss,
  setFormSchemaJson,
  setFields,
  setFormId,
  setFormName,
  setFormDescription,
  setIsLocked,
  handleSave,
  discardDraft,
}: {
  formId: string;
  formName: string;
  formDescription: string;
  formTemplateHtml: string;
  formTemplateCss: string;
  formSchemaJson: string;
  isLocked: boolean;
  previewHtml: string;
  setActiveTab: (tab: string) => void;
  setFormTemplateHtml: (val: string) => void;
  setFormTemplateCss: (val: string) => void;
  setFormSchemaJson: (val: string) => void;
  setFields: (fields: SectionTemplateField[]) => void;
  setFormId?: (id: string) => void;
  setFormName?: (name: string) => void;
  setFormDescription?: (desc: string) => void;
  setIsLocked?: (locked: boolean) => void;
  handleSave?: (force?: boolean) => Promise<any> | void;
  discardDraft?: () => void;
}) {
  // Window Editor Bridge for AI Agents
  useEffect(() => {
    (window as any).zygoEditor = {
      getValues: () => ({
        schema: formSchemaJson,
        html: formTemplateHtml,
        css: formTemplateCss,
      }),
      setTab: (tabName: string) => setActiveTab(tabName),
      updateField: (field: string, value: string) => {
        if (field === 'html') setFormTemplateHtml(value);
        else if (field === 'css') setFormTemplateCss(value);
        else if (field === 'schema') {
          setFormSchemaJson(value);
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              setFields(parsed);
            }
          } catch {
            // Ignore parse errors on partial typing
          }
        }
      },
    };
    return () => {
      delete (window as any).zygoEditor;
    };
  }, [
    formSchemaJson,
    formTemplateHtml,
    formTemplateCss,
    setActiveTab,
    setFormTemplateHtml,
    setFormTemplateCss,
    setFormSchemaJson,
    setFields,
  ]);

  // WebMCP Active Template Editor Tools
  useTemplateEditorWebMCP({
    formId,
    formName,
    formDescription,
    formTemplateHtml,
    formTemplateCss,
    formSchemaJson,
    isLocked,
    previewHtml,
    setFormTemplateHtml,
    setFormTemplateCss,
    setFormSchemaJson,
    setFields,
    setFormId,
    setFormName,
    setFormDescription,
    setIsLocked,
    handleSave,
    discardDraft,
  });
}
