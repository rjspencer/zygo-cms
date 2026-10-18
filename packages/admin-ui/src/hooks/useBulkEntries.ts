import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

export type BulkActionType = 'publish' | 'unpublish' | 'trash' | 'add_tags' | 'remove_tags';

export interface BulkEntriesPayload {
  ids: number[];
  action: BulkActionType;
  tags?: string;
}

export interface BulkEntriesResponse {
  success: boolean;
  affected: number;
  skipped: number;
  errors: string[];
}

export interface UseBulkEntriesOptions {
  onSuccess?: (data: BulkEntriesResponse) => void;
  onError?: (error: Error) => void;
}

export function useBulkEntries(options?: UseBulkEntriesOptions) {
  const queryClient = useQueryClient();

  const bulkMutation = useMutation<BulkEntriesResponse, Error, BulkEntriesPayload>({
    mutationFn: async (payload: BulkEntriesPayload) => {
      const res = await apiFetch('/api/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Bulk operation failed: ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      options?.onSuccess?.(data);
    },
    onError: (err) => {
      options?.onError?.(err);
    },
  });

  return {
    bulkMutate: bulkMutation.mutate,
    bulkMutateAsync: bulkMutation.mutateAsync,
    isPending: bulkMutation.isPending,
    error: bulkMutation.error,
  };
}
