import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { Redirect, CreateRedirectInput, UpdateRedirectInput } from '../types';

export function useRedirects(searchQuery?: string) {
  const query = useQuery<Redirect[]>({
    queryKey: ['redirects'],
    queryFn: async () => {
      const res = await apiFetch('/api/redirects');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to fetch redirects');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : data.redirects || [];
    },
  });

  const filtered = React.useMemo(() => {
    if (!query.data) return [];
    if (!searchQuery || !searchQuery.trim()) return query.data;
    const q = searchQuery.toLowerCase().trim();
    return query.data.filter(
      (item) =>
        item.source_path.toLowerCase().includes(q) ||
        item.target_url.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
    );
  }, [query.data, searchQuery]);

  return {
    ...query,
    data: filtered,
    redirects: filtered,
    allRedirects: query.data || [],
  };
}

export function useCreateRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRedirectInput) => {
      const res = await apiFetch('/api/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = 'Failed to create redirect';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }

      return res.json() as Promise<Redirect>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
    },
  });
}

export interface UpdateRedirectMutationParams {
  id: number;
  payload?: UpdateRedirectInput;
  source_path?: string;
  target_url?: string;
  status_code?: number;
  notes?: string;
}

export function useUpdateRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateRedirectMutationParams) => {
      const { id, payload, ...rest } = params;
      const body = payload ?? rest;
      const res = await apiFetch(`/api/redirects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errMsg = 'Failed to update redirect';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }

      return res.json() as Promise<Redirect>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
    },
  });
}

export function useDeleteRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/redirects/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        let errMsg = 'Failed to delete redirect';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
    },
  });
}
