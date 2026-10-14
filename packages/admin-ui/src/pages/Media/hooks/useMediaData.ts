import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { MediaItem } from '../types';

interface UseMediaDataOptions {
  onUploadSuccess?: () => void;
  onUploadSettled?: () => void;
}

export function useMediaData(options?: UseMediaDataOptions) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async (): Promise<MediaItem[]> => {
      const res = await apiFetch('/api/media');
      if (!res.ok) throw new Error('Failed to fetch media');
      const data = await res.json();
      const mediaList = Array.isArray(data.media) ? data.media : [];
      return mediaList.map((item: any) => ({
        id: item.key,
        name: item.filename,
        size:
          item.size < 1024 * 1024
            ? `${Math.round(item.size / 1024)} KB`
            : `${(item.size / (1024 * 1024)).toFixed(2)} MB`,
        type: item.mime_type,
        url: item.url || `/media/${item.key}`,
        uploadedAt: item.created_at ? item.created_at.split(' ')[0] : '',
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filename = encodeURIComponent(file.name);
      const res = await apiFetch(`/api/media?filename=${filename}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Upload failed (${res.status})`);
      }
      return res;
    },
    onSuccess: () => {
      options?.onUploadSuccess?.();
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onSettled: () => {
      options?.onUploadSettled?.();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/media/sync', {
        method: 'POST',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errMessage = text;
        try {
          const json = JSON.parse(text);
          errMessage = json.error || json.message || text;
        } catch {
          // Keep raw text
        }
        throw new Error(errMessage || `Sync failed (${res.status})`);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || 'Delete failed');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });

  return {
    items,
    isLoading,
    uploadMutation,
    syncMutation,
    deleteMutation,
  };
}
