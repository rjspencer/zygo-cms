import React from 'react';
import { Flex, Box, Text, Button, Card } from '@radix-ui/themes';
import { CaretUpIcon, CaretDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { SectionTemplateField } from '../types/sectionTemplate';
import { SectionFieldRenderer } from './SectionFieldRenderer';

export interface ListFieldProps {
  field: SectionTemplateField;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
}

export const ListField: React.FC<ListFieldProps> = ({
  field,
  items = [],
  onChange,
  onOpenMediaPicker,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const handleAddItem = () => {
    const newItem: Record<string, any> = {};
    onChange([...safeItems, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(safeItems.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...safeItems];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= safeItems.length - 1) return;
    const newItems = [...safeItems];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  const handleItemChange = (index: number, updatedData: Record<string, any>) => {
    const newItems = [...safeItems];
    newItems[index] = updatedData;
    onChange(newItems);
  };

  return (
    <Box style={{ border: '1px solid var(--gray-a4)', borderRadius: 'var(--radius-2)', padding: '12px' }}>
      <Flex direction="column" gap="3">
        {safeItems.map((item, index) => (
          <Card key={index} variant="surface" style={{ padding: 0, overflow: 'hidden' }}>
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
                  onClick={() => handleMoveUp(index)}
                >
                  <CaretUpIcon /> Up
                </Button>
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  disabled={index === safeItems.length - 1}
                  aria-label="Down"
                  title="Move Down"
                  onClick={() => handleMoveDown(index)}
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
                  onClick={() => handleRemove(index)}
                >
                  <TrashIcon /> Remove
                </Button>
              </Flex>
            </Flex>

            <Box p="3">
              <SectionFieldRenderer
                fields={field.fields || []}
                data={item || {}}
                onChange={(updated) => handleItemChange(index, updated)}
                onOpenMediaPicker={onOpenMediaPicker}
                isNested={true}
              />
            </Box>
          </Card>
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
