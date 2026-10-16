import React from 'react';
import { Box, Flex, Text, Grid } from '@radix-ui/themes';
import type { MediaPickerGridProps } from '../../types';
import { MediaPickerCard } from '../MediaPickerCard';

export const MediaPickerGrid: React.FC<MediaPickerGridProps> = ({
  items,
  filteredItems,
  onSelectItem,
}) => {
  return (
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
            <MediaPickerCard
              key={item.id}
              item={item}
              onSelect={onSelectItem}
            />
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MediaPickerGrid;
