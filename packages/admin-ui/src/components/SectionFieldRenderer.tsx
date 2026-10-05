import React from 'react';
import {
  Flex,
  Box,
  Text,
  Button,
  TextField,
  TextArea,
  Switch,
  Select,
} from '@radix-ui/themes';
import { RichTextEditor } from './RichTextEditor';
import { ListField } from './ListField';
import { SectionTemplateField } from '../types/sectionTemplate';

export interface SectionFieldRendererProps {
  fields: SectionTemplateField[];
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
  isNested?: boolean;
}

export const SectionFieldRenderer: React.FC<SectionFieldRendererProps> = ({
  fields,
  data = {},
  onChange,
  onOpenMediaPicker,
  isNested = false,
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

        return (
          <Box key={field.name}>
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              {field.label || field.name}
              {field.required && <Text color="red"> *</Text>}
            </Text>

            {field.type === 'boolean' ? (
              <Switch
                checked={Boolean(data[field.name])}
                onCheckedChange={(checked) => updateField(field.name, checked)}
                aria-label={field.label || field.name}
              />
            ) : field.type === 'image' ? (
              <Flex gap="2" align="center" wrap="wrap">
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => {
                    if (onOpenMediaPicker) {
                      onOpenMediaPicker((url) => updateField(field.name, url));
                    }
                  }}
                >
                  Select Image
                </Button>
                {data[field.name] && (
                  <Flex align="center" gap="2">
                    <Text size="1" color="gray" style={{ wordBreak: 'break-all' }}>
                      {data[field.name]}
                    </Text>
                    <Button
                      type="button"
                      variant="ghost"
                      color="red"
                      size="1"
                      onClick={() => updateField(field.name, '')}
                    >
                      Remove
                    </Button>
                  </Flex>
                )}
              </Flex>
            ) : field.type === 'textarea' ? (
              <TextArea
                value={data[field.name] ?? ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={`Enter ${field.label || field.name}`}
                aria-label={field.label || field.name}
              />
            ) : field.type === 'richtext' ? (
              <RichTextEditor
                value={data[field.name] ?? ''}
                onChange={(html) => updateField(field.name, html)}
                onOpenMediaPicker={onOpenMediaPicker}
                placeholder={`Enter ${field.label || field.name}`}
                minHeight="150px"
                aria-label={field.label || field.name}
              />
            ) : field.type === 'url' ? (
              <TextField.Root
                type="url"
                value={data[field.name] ?? ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder="https://..."
                aria-label={field.label || field.name}
              />
            ) : field.type === 'select' ? (
              <Select.Root
                value={data[field.name] ? String(data[field.name]) : undefined}
                onValueChange={(val) => updateField(field.name, val)}
              >
                <Select.Trigger
                  placeholder={`Select ${field.label || field.name}...`}
                  aria-label={field.label || field.name}
                />
                <Select.Content>
                  {(field.options || []).map((opt) => (
                    <Select.Item key={opt} value={opt}>
                      {opt}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            ) : field.type === 'list' ? (
              <ListField
                field={field}
                items={Array.isArray(data[field.name]) ? data[field.name] : []}
                onChange={(items) => updateField(field.name, items)}
                onOpenMediaPicker={onOpenMediaPicker}
              />
            ) : (
              /* Default fallback to text */
              <TextField.Root
                value={data[field.name] ?? ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={`Enter ${field.label || field.name}`}
                aria-label={field.label || field.name}
              />
            )}
          </Box>
        );
      })}
    </Flex>
  );
};

export default SectionFieldRenderer;
