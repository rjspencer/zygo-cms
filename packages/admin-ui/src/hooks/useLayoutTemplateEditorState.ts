import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import type { LayoutTemplate, LayoutTemplateRevision } from '../types/layoutTemplate';
import { useLayoutTemplateWebMCP } from '../lib/webmcp/layoutTemplateTools';

export interface UseLayoutTemplateEditorStateReturn {
  template: LayoutTemplate | undefined;
  isLoading: boolean;
  loadError: unknown;
  name: string;
  setName: (val: string) => void;
  html: string;
  setHtml: (val: string) => void;
  css: string;
  setCss: (val: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  handleSave: () => Promise<void>;
  handleReset: () => Promise<void>;
  revisions: LayoutTemplateRevision[];
  isLoadingRevisions: boolean;
  handleRestoreRevision: (revId: string) => Promise<void>;
  isResetDialogOpen: boolean;
  setIsResetDialogOpen: (open: boolean) => void;
  isRevisionsDialogOpen: boolean;
  setIsRevisionsDialogOpen: (open: boolean) => void;
}

export function useLayoutTemplateEditorState(
  templateId: 'post' | 'doc'
): UseLayoutTemplateEditorStateReturn {
  const queryClient = useQueryClient();

  const {
    data: template,
    isLoading,
    error: loadError,
  } = useQuery<LayoutTemplate>({
    queryKey: ['layout-templates', templateId],
    queryFn: async () => {
      const res = await apiFetch(`/api/layout-templates/${templateId}`);
      if (!res.ok) {
        throw new Error(`Failed to load ${templateId} template`);
      }
      return res.json();
    },
  });

  const {
    data: revisions = [],
    isLoading: isLoadingRevisions,
  } = useQuery<LayoutTemplateRevision[]>({
    queryKey: ['layout-template-revisions', templateId],
    queryFn: async () => {
      const res = await apiFetch(`/api/layout-templates/${templateId}/revisions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!template,
  });

  const [name, setName] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRevisionsDialogOpen, setIsRevisionsDialogOpen] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setHtml(template.template_html || '');
      setCss(template.template_css || '');
    }
  }, [template]);

  const hasUnsavedChanges = useMemo(() => {
    if (!template) return false;
    return (
      name !== (template.name || '') ||
      html !== (template.template_html || '') ||
      css !== (template.template_css || '')
    );
  }, [template, name, html, css]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSaveSuccess(false);
      const res = await apiFetch(`/api/layout-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          template_html: html,
          template_css: css,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to save template');
      }
      return res.json();
    },
    onSuccess: (updated: LayoutTemplate) => {
      queryClient.setQueryData(['layout-templates', templateId], updated);
      queryClient.invalidateQueries({ queryKey: ['layout-template-revisions', templateId] });
      setSaveSuccess(true);
    },
    onError: (err: unknown) => {
      setSaveError(err instanceof Error ? err.message : String(err));
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSaveSuccess(false);
      const res = await apiFetch(`/api/layout-templates/${templateId}/reset`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to reset template');
      }
      return res.json();
    },
    onSuccess: (resetTemplate: LayoutTemplate) => {
      queryClient.setQueryData(['layout-templates', templateId], resetTemplate);
      queryClient.invalidateQueries({ queryKey: ['layout-template-revisions', templateId] });
      setName(resetTemplate.name || '');
      setHtml(resetTemplate.template_html || '');
      setCss(resetTemplate.template_css || '');
      setIsResetDialogOpen(false);
      setSaveSuccess(true);
    },
    onError: (err: unknown) => {
      setSaveError(err instanceof Error ? err.message : String(err));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (revId: string) => {
      setSaveError(null);
      setSaveSuccess(false);
      const res = await apiFetch(`/api/layout-templates/${templateId}/restore/${revId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to restore revision');
      }
      return res.json();
    },
    onSuccess: (restoredTemplate: LayoutTemplate) => {
      queryClient.setQueryData(['layout-templates', templateId], restoredTemplate);
      queryClient.invalidateQueries({ queryKey: ['layout-template-revisions', templateId] });
      setName(restoredTemplate.name || '');
      setHtml(restoredTemplate.template_html || '');
      setCss(restoredTemplate.template_css || '');
      setIsRevisionsDialogOpen(false);
      setSaveSuccess(true);
    },
    onError: (err: unknown) => {
      setSaveError(err instanceof Error ? err.message : String(err));
    },
  });

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') setSaveSuccess(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const handleSave = useCallback(async () => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const handleReset = useCallback(async () => {
    await resetMutation.mutateAsync();
  }, [resetMutation]);

  const handleRestoreRevision = useCallback(
    async (revId: string) => {
      await restoreMutation.mutateAsync(revId);
    },
    [restoreMutation]
  );

  useLayoutTemplateWebMCP({
    templateId,
    template,
    html,
    setHtml,
    css,
    setCss,
    onSave: handleSave,
    onReset: handleReset,
    revisions,
    onRestoreRevision: handleRestoreRevision,
    isSaving: saveMutation.isPending,
  });

  return {
    template,
    isLoading,
    loadError,
    name,
    setName,
    html,
    setHtml,
    css,
    setCss,
    hasUnsavedChanges,
    isSaving: saveMutation.isPending || resetMutation.isPending || restoreMutation.isPending,
    saveSuccess,
    saveError,
    handleSave,
    handleReset,
    revisions,
    isLoadingRevisions,
    handleRestoreRevision,
    isResetDialogOpen,
    setIsResetDialogOpen,
    isRevisionsDialogOpen,
    setIsRevisionsDialogOpen,
  };
}
