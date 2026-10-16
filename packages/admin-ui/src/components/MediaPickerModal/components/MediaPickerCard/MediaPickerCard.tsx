import React from 'react';
import { Card, Flex, Box, Text, Button } from '@radix-ui/themes';
import { MediaThumbnail } from '../../MediaThumbnail';
import type { MediaPickerCardProps } from '../../types';

export const MediaPickerCard: React.FC<MediaPickerCardProps> = ({
  item,
  onSelect,
}) => {
  return (
    <Card
      key={item.id}
      size="1"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onClick={() => onSelect(item)}
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
        color="cyan"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item);
        }}
        aria-label={`Select ${item.name}`}
      >
        Select
      </Button>
    </Card>
  );
};

export default MediaPickerCard;
