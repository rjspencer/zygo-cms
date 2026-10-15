import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { TemplateItem, UseTemplatesDataReturn } from '../types';

export function useTemplatesData(): UseTemplatesDataReturn {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch current user information and role
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  const role = meData?.role?.toLowerCase() || 'author';
  const isAdmin = role === 'admin';
  const isDesigner = role === 'designer';

  // Fetch all templates (content_types)
  const {
    data: templates = [],
    isLoading,
    error: fetchError,
  } = useQuery<TemplateItem[], Error>({
    queryKey: ['content-types'],
    queryFn: async () => {
      const res = await apiFetch('/api/content-types');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Admin lock toggle mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ template, isLocked }: { template: TemplateItem; isLocked: boolean }) => {
      setActionError(null);
      const res = await apiFetch(`/api/content-types/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description || '',
          schema_json: template.schema_json || '[]',
          template_html: template.template_html || '',
          template_css: template.template_css || '',
          is_locked: isLocked,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to update template lock status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update lock status');
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setActionError(null);
      const res = await apiFetch(`/api/content-types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to delete template');
    },
  });

  return {
    templates,
    role,
    isAdmin,
    isDesigner,
    isLoading,
    fetchError,
    actionError,
    toggleLock: (template, isLocked) => toggleLockMutation.mutate({ template, isLocked }),
    isTogglingLock: toggleLockMutation.isPending,
    deleteTemplate: (id) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,
  };
}
