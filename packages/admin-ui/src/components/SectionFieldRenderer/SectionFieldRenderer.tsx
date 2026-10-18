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
  const baseId = React.useId();
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
        const controlId = `${baseId}-field-${field.name}`;
        const labelId = `${baseId}-label-${field.name}`;
        const errorId = `${baseId}-error-${field.name}`;
        const isLabelableControl = !['richtext', 'list', 'image', 'video'].includes(field.type);

        return (
          <Box key={field.name}>
            <Text
              as={isLabelableControl ? 'label' : 'div'}
              id={labelId}
              htmlFor={isLabelableControl ? controlId : undefined}
              size="2"
              weight="bold"
              mb="1"
              style={{ display: 'block' }}
            >
              {field.label || field.name}
              {field.required && <Text color="red"> *</Text>}
            </Text>

            <SectionFieldControl
              field={field}
              value={data[field.name]}
              onChange={(value) => updateField(field.name, value)}
              onOpenMediaPicker={onOpenMediaPicker}
              id={controlId}
              labelId={labelId}
              ariaInvalid={Boolean(fieldError)}
              ariaDescribedBy={fieldError ? errorId : undefined}
            />

            {fieldError && (
              <Text id={errorId} role="alert" size="1" color="red" mt="1" style={{ display: 'block' }}>
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
