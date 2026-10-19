import React from 'react';
import { Card, Flex, Box, Text, Badge, IconButton } from '@radix-ui/themes';
import { TrashIcon, ClipboardCopyIcon, CheckIcon } from '@radix-ui/react-icons';
import { MediaThumbnail } from '../../../components/MediaThumbnail';
import type { MediaCardProps } from '../types';

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  copiedId,
  onCopy,
  onDelete,
  isDeleting,
}) => {
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
          alt={item.name}
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
