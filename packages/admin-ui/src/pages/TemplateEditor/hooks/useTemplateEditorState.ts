import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { SectionTemplateField } from '../../../types/sectionTemplate';
import { useTemplateData } from './useTemplateData';
import { useTemplateWasmPreview } from './useTemplateWasmPreview';
import { useTemplateDraft } from './useTemplateDraft';
import { useTemplateSave } from './useTemplateSave';
import { useTemplateAgentBridge } from './useTemplateAgentBridge';

export function useTemplateEditorState(propId?: string) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId ?? paramId;
  const isNew = !id || id === 'new';

  const [activeTab, setActiveTab] = useState('schema');

  const {
    formId,
    setFormId,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    fields,
    setFields,
    formSchemaJson,
    setFormSchemaJson,
    formTemplateHtml,
    setFormTemplateHtml,
    formTemplateCss,
    setFormTemplateCss,
    isLocked,
    setIsLocked,
    isAdmin,
    isDesigner,
    template,
    isLoadingTemplate,
    loadError,
    setSavedSnapshot,
    latestFields,
    blocker,
    allowNextNavigation,
  } = useTemplateData(id, isNew);

  const handleFieldsChange = (newFields: SectionTemplateField[]) => {
    setFields(newFields);
    setFormSchemaJson(JSON.stringify(newFields, null, 2));
  };

  const {
    previewHtml,
    isStatusCompiling,
    renderCount,
    debouncedWasmHtml,
  } = useTemplateWasmPreview(formId, formTemplateHtml, formSchemaJson);

  const {
    hasDraft,
    isDiscardModalOpen,
    setIsDiscardModalOpen,
    discardDraft,
    clearDraft,
  } = useTemplateDraft({
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
  });

  const {
    isSaving,
    saveError,
    saveSuccess,
    conflictModalOpen,
    setConflictModalOpen,
    conflictMessage,
    warningModalOpen,
    setWarningModalOpen,
    warningList,
    handleSave,
  } = useTemplateSave({
    id,
    isNew,
    formId,
    formName,
    formDescription,
    formSchemaJson,
    formTemplateHtml,
    formTemplateCss,
    isLocked,
    setFormTemplateHtml,
    setFormTemplateCss,
    setSavedSnapshot,
    latestFields,
    clearDraft,
    allowNextNavigation,
  });

  useTemplateAgentBridge({
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
  });

  return {
    id,
    isNew,
    formId,
    setFormId,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    fields,
    handleFieldsChange,
    formSchemaJson,
    formTemplateHtml,
    setFormTemplateHtml,
    formTemplateCss,
    setFormTemplateCss,
    isLocked,
    setIsLocked,
    activeTab,
    setActiveTab,
    isAdmin,
    isDesigner,
    template,
    isLoadingTemplate,
    loadError,
    previewHtml,
    isStatusCompiling,
    renderCount,
    debouncedWasmHtml,
    hasDraft,
    isDiscardModalOpen,
    setIsDiscardModalOpen,
    discardDraft,
    isSaving,
    saveError,
    saveSuccess,
    conflictModalOpen,
    setConflictModalOpen,
    conflictMessage,
    warningModalOpen,
    setWarningModalOpen,
    warningList,
    handleSave,
    blocker,
  };
}
