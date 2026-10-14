import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { formatCode } from '../../../components/CodeEditor';

export function useTemplateSave({
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
}: {
  id: string | undefined;
  isNew: boolean;
  formId: string;
  formName: string;
  formDescription: string;
  formSchemaJson: string;
  formTemplateHtml: string;
  formTemplateCss: string;
  isLocked: boolean;
  setFormTemplateHtml: (val: string) => void;
  setFormTemplateCss: (val: string) => void;
  setSavedSnapshot: (val: string) => void;
  latestFields: React.MutableRefObject<Record<string, unknown>>;
  clearDraft: () => void;
  allowNextNavigation: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 409 Conflict Dialog state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  // 400 Warning Dialog state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningList, setWarningList] = useState<string[]>([]);

  const handleSave = async (force: boolean = false) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const targetId = (isNew ? formId : id || '').trim();
    if (!targetId) {
      setSaveError('Template Identifier (Slug) is required.');
      setIsSaving(false);
      return;
    }
    if (!formName.trim()) {
      setSaveError('Template Name is required.');
      setIsSaving(false);
      return;
    }

    const method = isNew ? 'POST' : 'PUT';
    const queryParam = force ? '?force=true' : '';
    const endpoint = `/api/content-types/${targetId}${queryParam}`;

    let finalHtml = formTemplateHtml;
    let finalCss = formTemplateCss;
    try {
      if (finalHtml) {
        finalHtml = await formatCode(finalHtml, 'html');
        setFormTemplateHtml(finalHtml);
      }
      if (finalCss) {
        finalCss = await formatCode(finalCss, 'css');
        setFormTemplateCss(finalCss);
      }
    } catch (e) {
      console.error('Prettier formatting failed', e);
    }

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      schema_json: formSchemaJson,
      template_html: finalHtml || null,
      template_css: finalCss || null,
      is_locked: isLocked,
      ...(force ? { force: true } : {}),
    };

    try {
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Guardrail: Intercept 409 Conflict
      if (res.status === 409) {
        const errorData = await res.json().catch(() => ({}));
        const msg =
          errorData.error ||
          errorData.message ||
          'Conflict detected: Breaking changes or selector collisions found.';
        setConflictMessage(msg);
        setConflictModalOpen(true);
        setIsSaving(false);
        return;
      }

      // Intercept 400 Warnings (requires_confirmation)
      if (res.status === 400) {
        const errorData = await res.json().catch(() => ({}));
        if (
          errorData.requires_confirmation &&
          Array.isArray(errorData.warnings) &&
          errorData.warnings.length > 0
        ) {
          setWarningList(errorData.warnings);
          setWarningModalOpen(true);
          setIsSaving(false);
          return;
        }
        throw new Error(
          errorData.error || errorData.message || `Failed to save template (${res.status})`
        );
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `Failed to save template (${res.status})`
        );
      }

      // Success
      setConflictModalOpen(false);
      setWarningModalOpen(false);
      setSaveSuccess(true);
      setSavedSnapshot(JSON.stringify(latestFields.current));
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      queryClient.invalidateQueries({ queryKey: ['content-type', targetId] });

      // Clear draft on successful save
      clearDraft();

      if (isNew) {
        allowNextNavigation();
        navigate(`/templates/${targetId}`, { replace: true });
      }
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred while saving the template.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
}
