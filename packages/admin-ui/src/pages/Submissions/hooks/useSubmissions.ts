import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type {
  FormSubmission,
  SubmissionStatus,
  SubmissionsQueryParams,
  SubmissionsListResponse,
  SubmissionStats,
} from '../types';

export function useSubmissions(params: SubmissionsQueryParams = {}) {
  const { status, form_name, q, page = 1, per_page = 20 } = params;

  return useQuery<SubmissionsListResponse>({
    queryKey: ['submissions', { status, form_name, q, page, per_page }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (status && status !== 'all') {
        searchParams.set('status', status);
      }
      if (form_name && form_name.trim()) {
        searchParams.set('form_name', form_name.trim());
      }
      if (q && q.trim()) {
        searchParams.set('q', q.trim());
      }
      searchParams.set('page', String(page));
      searchParams.set('per_page', String(per_page));

      const res = await apiFetch(`/api/submissions?${searchParams.toString()}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to fetch submissions');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        return {
          submissions: data as FormSubmission[],
          total: data.length,
          page,
          per_page,
          total_pages: Math.max(1, Math.ceil(data.length / per_page)),
        };
      }
      const rawList = Array.isArray(data.submissions)
        ? data.submissions
        : Array.isArray(data.items)
        ? data.items
        : [];
      const totalCount = Number(data.total ?? rawList.length);
      const resolvedPerPage = Number(data.per_page ?? per_page);
      return {
        submissions: rawList as FormSubmission[],
        total: totalCount,
        page: Number(data.page ?? page),
        per_page: resolvedPerPage,
        total_pages: Number(
          data.total_pages ?? Math.max(1, Math.ceil(totalCount / resolvedPerPage))
        ),
      };
    },
  });
}

export function useSubmissionStats() {
  return useQuery<SubmissionStats>({
    queryKey: ['submissions-stats'],
    queryFn: async () => {
      const res = await apiFetch('/api/submissions/stats');
      if (!res.ok) {
        return {
          total_count: 0,
          unread_count: 0,
          read_count: 0,
          archived_count: 0,
        };
      }
      const data = await res.json();
      return {
        total_count: Number(data.total_count ?? data.total ?? 0),
        unread_count: Number(data.unread_count ?? data.unread ?? 0),
        read_count: Number(data.read_count ?? data.read ?? 0),
        archived_count: Number(data.archived_count ?? data.archived ?? 0),
      };
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: SubmissionStatus }) => {
      const res = await apiFetch(`/api/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        let errMsg = 'Failed to update submission status';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }
      return res.json() as Promise<FormSubmission>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions-stats'] });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/submissions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        let errMsg = 'Failed to delete submission';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions-stats'] });
    },
  });
}
