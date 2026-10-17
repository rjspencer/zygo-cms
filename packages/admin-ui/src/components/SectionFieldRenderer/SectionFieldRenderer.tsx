import React from 'react';
import { Flex, Box, Text } from '@radix-ui/themes';
import { SectionFieldControl } from './components/SectionFieldControl';
import type { SectionFieldRendererProps } from './types';

export const SectionFieldRenderer: React.FC<SectionFieldRendererProps> = ({
  fields,
  data = {},
  onChange,
  onOpenMediaPicker,
  isNested = false,
  errors,
}) => {
  const updateField = (name: string, value: any) => {
    onChange({
      ...data,
      [name]: value,
    });
  };

  if (!fields || fields.length === 0) {
    return <Text size="2" color="gray">No fields defined in schema.</Text>;
  }

  return (
    <Flex direction="column" gap="4">
      {fields.map((field) => {
        // Enforce 1-level limit on list fields
        if (field.type === 'list' && isNested) {
          return null;
        }

        const fieldError = errors?.[field.name];

        return (
          <Box key={field.name}>
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              {field.label || field.name}
              {field.required && <Text color="red"> *</Text>}
            </Text>

            <SectionFieldControl
              field={field}
              value={data[field.name]}
              onChange={(value) => updateField(field.name, value)}
              onOpenMediaPicker={onOpenMediaPicker}
            />

            {fieldError && (
              <Text role="alert" size="1" color="red" mt="1" style={{ display: 'block' }}>
                {fieldError}
              </Text>
            )}
          </Box>
        );
      })}
    </Flex>
  );
};

export default SectionFieldRenderer;
