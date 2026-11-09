import React, { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Badge, IconButton, TextField } from '@radix-ui/themes';
import {
  TrashIcon,
  ClipboardCopyIcon,
  CheckIcon,
  Cross2Icon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import { MediaThumbnail } from '../../../components/MediaThumbnail';
import type { MediaCardProps } from '../types';

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  copiedId,
  onCopy,
  onDelete,
  isDeleting,
  onUpdateAltText,
  isUpdatingAltText = false,
}) => {
  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState(item.altText || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAltDraft(item.altText || '');
  }, [item.altText]);

  const handleSaveAlt = async () => {
    if (onUpdateAltText) {
      setIsSaving(true);
      try {
        await onUpdateAltText(item.id, altDraft);
        setIsEditingAlt(false);
      } catch {
        // preserve draft and remain in editing state so user can retry
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditingAlt(false);
    }
  };

  const handleCancelAlt = () => {
    setAltDraft(item.altText || '');
    setIsEditingAlt(false);
  };

  return (
    <Card size="2">
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
          alt={item.altText || item.name}
          type={item.type}
          height="140px"
          size="thumb"
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

      {isEditingAlt ? (
        <Flex direction="column" gap="2" my="2">
          <TextField.Root
            size="1"
            value={altDraft}
            onChange={(e) => setAltDraft(e.target.value)}
            placeholder="Describe image for accessibility..."
            aria-label="Alt text"
            data-testid="media-alt-input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveAlt();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelAlt();
              }
            }}
          />
          <Flex gap="2" justify="end">
            <IconButton
              style={{ cursor: 'pointer' }}
              size="1"
              variant="soft"
              color="gray"
              aria-label="Cancel editing alt text"
              data-testid="media-alt-cancel"
              onClick={handleCancelAlt}
              type="button"
            >
              <Cross2Icon />
            </IconButton>
            <IconButton
              style={{ cursor: 'pointer' }}
              size="1"
              variant="solid"
              color="blue"
              aria-label="Save alt text"
              data-testid="media-alt-save"
              disabled={isSaving || isUpdatingAltText}
              onClick={handleSaveAlt}
              type="button"
            >
              <CheckIcon />
            </IconButton>
          </Flex>
        </Flex>
      ) : (
        <Flex align="center" justify="between" gap="2" my="2">
          <Box style={{ flex: 1, minWidth: 0 }}>
            {item.altText ? (
              <Text
                size="1"
                color="gray"
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={item.altText}
              >
                Alt: {item.altText}
              </Text>
            ) : (
              <Badge size="1" color="amber" variant="surface">
                No alt text
              </Badge>
            )}
          </Box>
          <IconButton
            style={{ cursor: 'pointer' }}
            size="1"
            variant="ghost"
            color="gray"
            aria-label={`Edit alt text for ${item.name}`}
            data-testid="edit-alt-button"
            onClick={() => {
              setAltDraft(item.altText || '');
              setIsEditingAlt(true);
            }}
            type="button"
          >
            <Pencil1Icon />
          </IconButton>
        </Flex>
      )}

      <Flex justify="between" align="center" mt="3">
        <Text size="1" color="gray">
          {item.uploadedAt}
        </Text>
        <Flex gap="1">
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            color="gray"
            onClick={() => onCopy(item.id, item.url)}
            title="Copy URL"
          >
            {copiedId === item.id ? (
              <CheckIcon color="green" />
            ) : (
              <ClipboardCopyIcon />
            )}
          </IconButton>
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            color="red"
            onClick={() => onDelete(item.id)}
            title="Delete"
            disabled={isDeleting}
          >
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Card>
  );
};
