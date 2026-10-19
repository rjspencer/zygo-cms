import { useState, useRef } from 'react';
import type React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import { prepareMediaUpload } from '../../../utils/imageOptimization';
import type { MediaItem } from '../types';

export interface UseMediaPickerDataProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, altText: string) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB edge worker upload limit
const WARN_VIDEO_SIZE = 10 * 1024 * 1024; // 10 MB

export const useMediaPickerData = ({
  open,
  onClose,
  onSelect,
}: UseMediaPickerDataProps) => {
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [fileError, setFileError] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ['media'],
    queryFn: async (): Promise<MediaItem[]> => {
      const res = await apiFetch('/api/media');
      if (!res.ok) throw new Error('Failed to fetch media');
      const data = await res.json();
      const mediaList = Array.isArray(data.media) ? data.media : [];
      return mediaList.map((item: any) => {
        const itemSize = item.size ?? item.size_bytes ?? 0;
        return {
          id: String(item.key || item.id || Math.random()),
          name: item.filename || item.key || 'Untitled',
          size:
            itemSize < 1024 * 1024
              ? `${Math.round(itemSize / 1024)} KB`
              : `${(itemSize / (1024 * 1024)).toFixed(2)} MB`,
          type: item.mime_type || '',
          url: item.url || `/media/${item.key}`,
          uploadedAt: item.created_at ? item.created_at.split(' ')[0] : '',
        };
      });
    },
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareMediaUpload(file);
      let res: Response;

      if (prepared.thumb || prepared.md) {
        const formData = new FormData();
        formData.append('file', prepared.file);
        if (prepared.thumb) {
          formData.append('thumb', prepared.thumb, 'thumb.webp');
        }
        if (prepared.md) {
          formData.append('md', prepared.md, 'md.webp');
        }
        res = await apiFetch('/api/media', {
          method: 'POST',
          body: formData,
        });
      } else {
        const filename = encodeURIComponent(prepared.file.name);
        res = await apiFetch(`/api/media?filename=${filename}`, {
          method: 'POST',
          headers: {
            'Content-Type': prepared.file.type || 'application/octet-stream',
          },
          body: prepared.file,
        });
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Upload failed (${res.status})`);
      }
      return res;
    },
    onSuccess: () => {
      setSearch('');
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onSettled: () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed upload size is 25 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogv|ogg)$/i.test(file.name);
    if (isVideo && file.size > WARN_VIDEO_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const confirmed = window.confirm(
        `Warning: This video is ${sizeMb} MB. Large background videos may cause slower page loading and buffering on mobile connections. We recommend videos under 5-10 MB.\n\nDo you want to continue uploading?`
      );
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    uploadMutation.mutate(file);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectItem = (item: MediaItem) => {
    onSelect(item.url, item.name);
    onClose();
  };

  return {
    search,
    setSearch,
    fileInputRef,
    fileError,
    items,
    uploadMutation,
    handleFileUpload,
    filteredItems,
    handleSelectItem,
  };
};

export default useMediaPickerData;
