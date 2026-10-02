import React, { useState, useRef } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Grid,
  Badge,
  TextField,
  IconButton,
} from '@radix-ui/themes';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ClipboardCopyIcon,
  CheckIcon,
  UploadIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { MediaThumbnail } from '../components/MediaThumbnail';
import { apiFetch } from '../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MediaItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export const Media: React.FC = () => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
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
        url: item.url,
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
      setSearch('');
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onSettled: () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Media Library
          </Heading>
          <Text size="2" color="gray">
            Upload and manage assets stored in Cloudflare R2 / KV
          </Text>
        </Box>
        <Flex gap="2">
          {Boolean(import.meta.env.DEV && (import.meta.env.DEV as any) !== 'false') && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncMutation.isPending || uploadMutation.isPending}
              loading={syncMutation.isPending}
              aria-label="Sync"
            >
              <ReloadIcon width="16" height="16" />
              Sync
            </Button>
          )}
          <Button
            variant="solid"
            color="iris"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || syncMutation.isPending}
            loading={uploadMutation.isPending}
            aria-label="Upload Image"
          >
            <UploadIcon width="16" height="16" />
            Upload Image
          </Button>
        </Flex>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
          aria-label="Upload Image Input"
          data-testid="media-file-input"
        />
      </Flex>

      {uploadMutation.isError && (
        <Box mb="4">
          <Text color="red" size="2">
            {uploadMutation.error?.message || 'Failed to upload image'}
          </Text>
        </Box>
      )}

      {syncMutation.isError && (
        <Box mb="4">
          <Text color="red" size="2">
            {syncMutation.error?.message || 'Failed to sync media'}
          </Text>
        </Box>
      )}

      {deleteMutation.isError && (
        <Box mb="4">
          <Text color="red" size="2">
            {deleteMutation.error?.message || 'Failed to delete media'}
          </Text>
        </Box>
      )}

      <Card size="2" mb="4">
        <TextField.Root
          placeholder="Search media by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Card>

      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
        {filteredItems.map((item) => (
          <Card key={item.id} size="2">
            <Flex
              align="center"
              justify="center"
              mb="3"
              style={{
                borderRadius: 'var(--radius-3)',
                backgroundColor: 'var(--gray-a3)',
                height: '140px',
                overflow: 'hidden',
              }}
            >
              <MediaThumbnail
                src={item.url}
                alt={item.name}
                type={item.type}
                height="140px"
              />
            </Flex>

            <Flex justify="between" align="start" mb="2">
              <Box style={{ overflow: 'hidden' }}>
                <Text
                  weight="bold"
                  size="2"
                  style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {item.name}
                </Text>
                <Text size="1" color="gray">
                  {item.size} • {item.type}
                </Text>
              </Box>
              <Badge size="1" color="gray">
                R2
              </Badge>
            </Flex>

            <Flex justify="between" align="center" mt="3">
              <Text size="1" color="gray">
                {item.uploadedAt}
              </Text>
              <Flex gap="1">
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => handleCopy(item.id, item.url)}
                  title="Copy URL"
                >
                  {copiedId === item.id ? (
                    <CheckIcon color="green" />
                  ) : (
                    <ClipboardCopyIcon />
                  )}
                </IconButton>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  disabled={deleteMutation.isPending}
                >
                  <TrashIcon />
                </IconButton>
              </Flex>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Box>
  );
};

export default Media;
