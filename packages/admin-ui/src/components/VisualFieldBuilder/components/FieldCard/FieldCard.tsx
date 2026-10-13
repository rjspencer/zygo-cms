import React from 'react';
import {
  Box,
  Flex,
  Card,
  Text,
  TextField,
  Select,
  Switch,
  IconButton,
} from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import { FIELD_TYPES } from '../../constants';
import { FieldCardProps } from '../../types';
import { SelectOptionsEditor } from '../SelectOptionsEditor';
import { ListSubfieldsEditor } from '../ListSubfieldsEditor';

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  index,
  disabled = false,
  fieldId,
  onLabelChange,
  onNameChange,
  onTypeChange,
  onRequiredChange,
  onRemoveField,
  onOptionsChange,
  onAddSubfield,
  onRemoveSubfield,
  onSubfieldLabelChange,
  onSubfieldNameChange,
  onSubfieldTypeChange,
  onSubfieldRequiredChange,
  onSubfieldOptionsChange,
  getFieldId,
}) => {
  const isSelect = field.type === 'select';
  const isList = field.type === 'list';

  return (
    <Card
      key={fieldId}
      size="2"
      style={{
        border: '1px solid var(--gray-5)',
        backgroundColor: 'var(--color-panel-solid)',
      }}
    >
      <Flex direction="row" gap="3" align="end" wrap="wrap">
        {/* Label */}
        <Box style={{ flex: '1 1 180px' }}>
          <Text
            as="label"
            htmlFor={`field-label-${index}`}
            size="1"
            weight="bold"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Label
          </Text>
          <TextField.Root
            id={`field-label-${index}`}
            value={field.label}
            onChange={(e) => onLabelChange(index, e.target.value)}
            placeholder="Field Label"
            aria-label="Field Label"
            disabled={disabled}
          />
        </Box>

        {/* Name (Key) */}
        <Box style={{ flex: '1 1 180px' }}>
          <Text
            as="label"
            htmlFor={`field-name-${index}`}
            size="1"
            weight="bold"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Name (Key)
          </Text>
          <TextField.Root
            id={`field-name-${index}`}
            value={field.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder="Field Name"
            aria-label="Field Name"
            disabled={disabled}
          />
        </Box>

        {/* Type */}
        <Box style={{ width: '140px' }}>
          <Text
            as="label"
            size="1"
            weight="bold"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Type
          </Text>
          <Select.Root
            value={field.type || 'text'}
            onValueChange={(val) => onTypeChange(index, val)}
            disabled={disabled}
          >
            <Select.Trigger
              aria-label="Field Type"
              style={{ width: '100%' }}
            />
            <Select.Content>
              {FIELD_TYPES.map((t) => (
                <Select.Item key={t.value} value={t.value}>
                  {t.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>

        {/* Required Switch */}
        <Flex align="center" gap="2" pb="2">
          <Switch
            id={`field-req-${index}`}
            checked={Boolean(field.required)}
            onCheckedChange={(checked) => onRequiredChange(index, checked)}
            disabled={disabled}
            aria-label="Required"
          />
          <Text
            as="label"
            htmlFor={`field-req-${index}`}
            size="2"
            weight="medium"
          >
            Required
          </Text>
        </Flex>

        {/* Delete Button */}
        <IconButton
          type="button"
          size="2"
          color="red"
          variant="soft"
          onClick={() => onRemoveField(index)}
          disabled={disabled}
          aria-label="Delete field"
          title="Delete field"
        >
          <TrashIcon width="16" height="16" />
        </IconButton>
      </Flex>

      {/* Select Options Editor */}
      {isSelect && (
        <SelectOptionsEditor
          options={field.options}
          onChange={(opts) => onOptionsChange(index, opts)}
          disabled={disabled}
        />
      )}

      {/* List Sub-fields Editor */}
      {isList && (
        <ListSubfieldsEditor
          fieldIndex={index}
          subfields={field.fields}
          disabled={disabled}
          onAddSubfield={onAddSubfield}
          onRemoveSubfield={onRemoveSubfield}
          onSubfieldLabelChange={onSubfieldLabelChange}
          onSubfieldNameChange={onSubfieldNameChange}
          onSubfieldTypeChange={onSubfieldTypeChange}
          onSubfieldRequiredChange={onSubfieldRequiredChange}
          onSubfieldOptionsChange={onSubfieldOptionsChange}
          getFieldId={getFieldId}
        />
      )}
    </Card>
  );
};

export default FieldCard;
