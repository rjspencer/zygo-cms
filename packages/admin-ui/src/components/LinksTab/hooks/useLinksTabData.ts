import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { TrackableLink } from '../types';

export interface UseLinksTabDataParams {
  entryId: string | undefined;
  baseCanonicalUrl: string;
}

export const useLinksTabData = ({ entryId, baseCanonicalUrl }: UseLinksTabDataParams) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const { data: links = [], isLoading } = useQuery<TrackableLink[]>({
    queryKey: ['trackable_links', entryId],
    queryFn: async () => {
      const res = await apiFetch(`/api/entries/${entryId}/links`);
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json();
    },
    enabled: !!entryId && entryId !== 'new',
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; url_params: string }) => {
      const res = await apiFetch(`/api/entries/${entryId}/links`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackable_links', entryId] });
      setIsCreateOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const res = await apiFetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackable_links', entryId] });
    },
  });

  const handleCreate = async (payload: { name: string; url_params: string }) => {
    await createMutation.mutateAsync(payload);
  };

  const handleDelete = (linkId: number) => {
    if (confirm('Are you sure you want to delete this link?')) {
      deleteMutation.mutate(linkId);
    }
  };

  useEffect(() => {
    if (!copiedLink) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') setCopiedLink(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedLink]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const absoluteCanonicalUrl = baseCanonicalUrl.startsWith('http')
    ? baseCanonicalUrl
    : `${(settings.canonical_origin || '').replace(/\/+$/, '')}/${baseCanonicalUrl.replace(/^\/+/, '')}`;

  const constructFullUrl = (paramsString: string) => {
    const divider = absoluteCanonicalUrl.includes('?') ? '&' : '?';
    return paramsString ? `${absoluteCanonicalUrl}${divider}${paramsString}` : absoluteCanonicalUrl;
  };

  return {
    settings,
    links,
    isLoading,
    createMutation,
    deleteMutation,
    isCreateOpen,
    setIsCreateOpen,
    copiedLink,
    handleCopy,
    handleCreate,
    handleDelete,
    absoluteCanonicalUrl,
    constructFullUrl,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
