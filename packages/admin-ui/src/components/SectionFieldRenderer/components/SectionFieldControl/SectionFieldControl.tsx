import React from 'react';
import { Flex, Text, Button, TextField, TextArea, Switch, Select } from '@radix-ui/themes';
import { RichTextEditor } from '../../../RichTextEditor';
import { ListField } from '../../../ListField';
import type { SectionFieldControlProps } from '../../types';

export const SectionFieldControl: React.FC<SectionFieldControlProps> = ({
  field,
  value,
  onChange,
  onOpenMediaPicker,
  id,
  labelId,
  ariaInvalid,
  ariaDescribedBy,
}) => {
  if (field.type === 'boolean') {
    return (
      <Switch
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked)}
        aria-label={field.label || field.name}
      />
    );
  }

  if (field.type === 'image' || field.type === 'video') {
    return (
      <Flex role="group" aria-labelledby={labelId} gap="2" align="center" wrap="wrap">
        <Button
          type="button"
          variant="soft"
          onClick={() => {
            if (onOpenMediaPicker) {
              onOpenMediaPicker((url) => onChange(url));
            }
          }}
        >
          {field.type === 'video' ? 'Select Video' : 'Select Image'}
        </Button>
        {value && (
          <Flex align="center" gap="2">
            <Text size="1" color="gray" style={{ wordBreak: 'break-all' }}>
              {value}
            </Text>
            <Button
              type="button"
              variant="ghost"
              color="red"
              size="1"
              onClick={() => onChange('')}
            >
              Remove
            </Button>
          </Flex>
        )}
      </Flex>
    );
  }

  if (field.type === 'textarea') {
    return (
      <TextArea
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${field.label || field.name}`}
        aria-label={field.label || field.name}
      />
    );
  }

  if (field.type === 'richtext') {
    return (
      <RichTextEditor
        value={value ?? ''}
        onChange={(html) => onChange(html)}
        onOpenMediaPicker={onOpenMediaPicker}
        placeholder={`Enter ${field.label || field.name}`}
        minHeight="150px"
        aria-label={field.label || field.name}
      />
    );
  }

  if (field.type === 'url') {
    return (
      <TextField.Root
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        aria-label={field.label || field.name}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select.Root
        value={value ? String(value) : undefined}
        onValueChange={(val) => onChange(val)}
      >
        <Select.Trigger
          id={id}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
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
    );
  }

  if (field.type === 'list') {
    return (
      <ListField
        field={field}
        items={Array.isArray(value) ? value : []}
        onChange={(items) => onChange(items)}
        onOpenMediaPicker={onOpenMediaPicker}
      />
    );
  }

  /* Default fallback to text */
  return (
    <TextField.Root
      id={id}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${field.label || field.name}`}
      aria-label={field.label || field.name}
    />
  );
};

export default SectionFieldControl;
