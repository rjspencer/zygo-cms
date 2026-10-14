import React from 'react';
import { Grid } from '@radix-ui/themes';
import { MediaCard } from './MediaCard';
import type { MediaGridProps } from '../types';

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  copiedId,
  onCopy,
  onDelete,
  isDeleting,
}) => {
  return (
    <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          copiedId={copiedId}
          onCopy={onCopy}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </Grid>
  );
};
