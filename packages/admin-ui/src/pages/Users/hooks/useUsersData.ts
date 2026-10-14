import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { UserItem, InviteUserPayload, EditUserPayload } from '../types';

interface UseUsersDataOptions {
  onInviteSuccess?: (data: UserItem, variables: InviteUserPayload) => void;
  onEditSuccess?: (data: UserItem) => void;
  onDeleteSuccess?: (deletedId: number) => void;
}

export function useUsersData(options?: UseUsersDataOptions) {
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<UserItem[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        const userList: UserItem[] = Array.isArray(data) ? data : data.users || [];
        return userList.filter((u) => !u.deleted_at);
      } else {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load users');
      }
    },
  });

  const fetchError = queryError ? (queryError as Error).message : null;

  const inviteMutation = useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errMsg = 'Failed to invite user';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<UserItem[]>(['adminUsers'], (old) =>
        old ? [...old, data] : [data]
      );
      options?.onInviteSuccess?.(data, variables);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EditUserPayload }) => {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errMsg = 'Failed to update user';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<UserItem[]>(['adminUsers'], (old) =>
        old ? old.map((u) => (u.id === data.id ? data : u)) : [data]
      );
      options?.onEditSuccess?.(data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let errMsg = 'Failed to delete user';
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
    onSuccess: (deletedId) => {
      queryClient.setQueryData<UserItem[]>(['adminUsers'], (old) =>
        old ? old.filter((u) => u.id !== deletedId) : []
      );
      options?.onDeleteSuccess?.(deletedId);
    },
  });

  return {
    users,
    loading,
    fetchError,
    inviteMutation,
    editMutation,
    deleteMutation,
  };
}
