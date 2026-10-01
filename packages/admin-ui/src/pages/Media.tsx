import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await apiFetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        const mediaList = Array.isArray(data.media) ? data.media : [];
        const mapped = mediaList.map((item: any) => ({
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
        setItems(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch media', err);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setSyncError(null);

    try {
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

      setSearch('');
      await fetchMedia();
    } catch (err: any) {
      console.error('Failed to upload media', err);
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setUploadError(null);

    try {
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

      await fetchMedia();
    } catch (err: any) {
      console.error('Failed to sync media', err);
      setSyncError(err.message || 'Failed to sync media');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        console.error('Delete failed', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
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
              disabled={isSyncing || isUploading}
              loading={isSyncing}
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
            disabled={isUploading || isSyncing}
            loading={isUploading}
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

      {uploadError && (
        <Box mb="4">
          <Text color="red" size="2">
            {uploadError}
          </Text>
        </Box>
      )}

      {syncError && (
        <Box mb="4">
          <Text color="red" size="2">
            {syncError}
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
