import React from 'react';
import { Flex, Box, Button } from '@radix-ui/themes';
import { ListFieldItemCard } from './components/ListFieldItemCard';
import { useListFieldActions } from './hooks/useListFieldActions';
import type { ListFieldProps } from './types';

export const ListField: React.FC<ListFieldProps> = ({
  field,
  items = [],
  onChange,
  onOpenMediaPicker,
}) => {
  const {
    safeItems,
    handleAddItem,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handleItemChange,
  } = useListFieldActions(items, onChange);

  return (
    <Box style={{ border: '1px solid var(--gray-a4)', borderRadius: 'var(--radius-2)', padding: '12px' }}>
      <Flex direction="column" gap="3">
        {safeItems.map((item, index) => (
          <ListFieldItemCard
            key={index}
            item={item}
            index={index}
            totalItems={safeItems.length}
            field={field}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={handleRemove}
            onChange={handleItemChange}
            onOpenMediaPicker={onOpenMediaPicker}
          />
        ))}

        <Box pt="1">
          <Button
            type="button"
            variant="soft"
            size="2"
            onClick={handleAddItem}
          >
            + Add item
          </Button>
        </Box>
      </Flex>
    </Box>
  );
};

export default ListField;
