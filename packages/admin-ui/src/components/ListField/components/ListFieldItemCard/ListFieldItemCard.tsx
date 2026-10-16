import React from 'react';
import { Flex, Box, Text, Button, Card } from '@radix-ui/themes';
import { CaretUpIcon, CaretDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { SectionFieldRenderer } from '../../../SectionFieldRenderer';
import type { ListFieldItemCardProps } from '../../types';

export const ListFieldItemCard: React.FC<ListFieldItemCardProps> = ({
  item,
  index,
  totalItems,
  field,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChange,
  onOpenMediaPicker,
}) => {
  return (
    <Card variant="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <Flex
        align="center"
        justify="between"
        p="2"
        style={{
          backgroundColor: 'var(--gray-a2)',
          borderBottom: '1px solid var(--gray-a4)',
        }}
      >
        <Text weight="bold" size="2">
          Item #{index + 1}
        </Text>
        <Flex gap="2">
          <Button
            type="button"
            size="1"
            variant="soft"
            disabled={index === 0}
            aria-label="Up"
            title="Move Up"
            onClick={() => onMoveUp(index)}
          >
            <CaretUpIcon /> Up
          </Button>
          <Button
            type="button"
            size="1"
            variant="soft"
            disabled={index === totalItems - 1}
            aria-label="Down"
            title="Move Down"
            onClick={() => onMoveDown(index)}
          >
            <CaretDownIcon /> Down
          </Button>
          <Button
            type="button"
            size="1"
            variant="soft"
            color="red"
            aria-label="Remove"
            title="Remove Item"
            onClick={() => onRemove(index)}
          >
            <TrashIcon /> Remove
          </Button>
        </Flex>
      </Flex>

      <Box p="3">
        <SectionFieldRenderer
          fields={field.fields || []}
          data={item || {}}
          onChange={(updated) => onChange(index, updated)}
          onOpenMediaPicker={onOpenMediaPicker}
          isNested={true}
        />
      </Box>
    </Card>
  );
};

export default ListFieldItemCard;
