import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  Flex,
  Box,
  Text,
  Button,
  Card,
  Grid,
  TextField,
  IconButton,
} from '@radix-ui/themes';
import {
  MagnifyingGlassIcon,
  Cross2Icon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { MediaThumbnail } from './MediaThumbnail';
import { apiFetch } from '../utils/api';

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, altText: string) => void;
}

interface MediaItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await apiFetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        const mediaList = Array.isArray(data.media) ? data.media : [];
        const mapped = mediaList.map((item: any) => {
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
        setItems(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch media', err);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchMedia();
  }, [open, fetchMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

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

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectItem = (item: MediaItem) => {
    onSelect(item.url, item.name);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Content maxWidth="680px">
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title style={{ margin: 0 }}>Select Media</Dialog.Title>
          <Dialog.Close>
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={onClose}
              aria-label="Close"
            >
              <Cross2Icon width="16" height="16" />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <Dialog.Description size="2" color="gray" mb="3">
          Choose an asset from your media library.
        </Dialog.Description>

        <Flex gap="3" align="center" mb="3">
          <Box style={{ flex: 1 }}>
            <Card size="1">
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
          </Box>
          <Button
            variant="solid"
            color="iris"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            loading={isUploading}
            aria-label="Upload Image"
          >
            <UploadIcon width="16" height="16" />
            Upload Image
          </Button>
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
          <Box mb="3">
            <Text color="red" size="2">
              {uploadError}
            </Text>
          </Box>
        )}

        <Box style={{ maxHeight: '380px', overflowY: 'auto' }} p="1">
          {filteredItems.length === 0 ? (
            <Flex align="center" justify="center" p="6">
              <Text size="2" color="gray">
                {items.length === 0 ? 'No media found' : 'No matching media'}
              </Text>
            </Flex>
          ) : (
            <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  size="1"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => handleSelectItem(item)}
                >
                  <Flex
                    align="center"
                    justify="center"
                    mb="2"
                    style={{
                      borderRadius: 'var(--radius-2)',
                      backgroundColor: 'var(--gray-a3)',
                      height: '100px',
                      overflow: 'hidden',
                    }}
                  >
                    <MediaThumbnail
                      src={item.url}
                      alt={item.name}
                      type={item.type}
                      height="100px"
                    />
                  </Flex>

                  <Box mb="2" style={{ overflow: 'hidden' }}>
                    <Text
                      weight="bold"
                      size="2"
                      style={{
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </Text>
                    <Text size="1" color="gray">
                      {item.size}
                    </Text>
                  </Box>

                  <Button
                    size="1"
                    variant="soft"
                    color="iris"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(item);
                    }}
                    aria-label={`Select ${item.name}`}
                  >
                    Select
                  </Button>
                </Card>
              ))}
            </Grid>
          )}
        </Box>

        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default MediaPickerModal;
