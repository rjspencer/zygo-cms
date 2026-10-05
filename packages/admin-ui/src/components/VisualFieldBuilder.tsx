import React, { useState, useRef } from 'react';
import {
  Box,
  Flex,
  Card,
  Text,
  Button,
  TextField,
  Select,
  Switch,
  IconButton,
} from '@radix-ui/themes';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { SectionTemplateField } from '../types/sectionTemplate';

export interface VisualFieldBuilderProps {
  fields: SectionTemplateField[];
  onChange: (fields: SectionTemplateField[]) => void;
  disabled?: boolean;
}

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'url', label: 'URL' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'image', label: 'Image' },
  { value: 'select', label: 'Select' },
  { value: 'list', label: 'List' },
] as const;

export const SUBFIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'url', label: 'URL' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'image', label: 'Image' },
  { value: 'select', label: 'Select' },
] as const;

export const slugify = (label: string): string => {
  if (!label) return '';
  return label
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
};

interface SelectOptionsEditorProps {
  options?: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}

const SelectOptionsEditor: React.FC<SelectOptionsEditorProps> = ({
  options = [],
  onChange,
  disabled = false,
}) => {
  const handleAddOption = () => {
    onChange([...options, '']);
  };

  const handleOptionChange = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  const handleRemoveOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <Box mt="3" pt="3" style={{ borderTop: '1px solid var(--gray-4)' }}>
      <Flex justify="between" align="center" mb="2">
        <Text size="2" weight="bold">
          Select Options
        </Text>
        <Button
          type="button"
          size="1"
          variant="soft"
          onClick={handleAddOption}
          disabled={disabled}
          aria-label="Add Option"
        >
          <PlusIcon width="12" height="12" /> Add Option
        </Button>
      </Flex>
      {options.length === 0 ? (
        <Text size="1" color="gray">
          No options added yet. Click &quot;Add Option&quot; to configure choices.
        </Text>
      ) : (
        <Flex direction="column" gap="2">
          {options.map((opt, optIdx) => (
            <Flex key={optIdx} gap="2" align="center">
              <TextField.Root
                size="1"
                style={{ flex: 1 }}
                value={opt}
                onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                placeholder={`Option ${optIdx + 1}`}
                aria-label={`Option ${optIdx + 1}`}
                disabled={disabled}
              />
              <IconButton
                type="button"
                size="1"
                color="red"
                variant="ghost"
                onClick={() => handleRemoveOption(optIdx)}
                disabled={disabled}
                aria-label={`Remove option ${optIdx + 1}`}
              >
                <TrashIcon width="14" height="14" />
              </IconButton>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
};

export const VisualFieldBuilder: React.FC<VisualFieldBuilderProps> = ({
  fields = [],
  onChange,
  disabled = false,
}) => {
  const fieldIdMap = useRef(new WeakMap<SectionTemplateField, string>());
  const idCounter = useRef(0);
  const [manuallyEditedIds, setManuallyEditedIds] = useState<Set<string>>(new Set());

  const getFieldId = (f: SectionTemplateField): string => {
    if ((f as any)._builderId) {
      return (f as any)._builderId;
    }
    let id = fieldIdMap.current.get(f);
    if (!id) {
      id = `fld_${++idCounter.current}`;
      fieldIdMap.current.set(f, id);
    }
    try {
      Object.defineProperty(f, '_builderId', {
        value: id,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore if non-extensible
    }
    return id;
  };

  const cloneWithId = <T extends SectionTemplateField>(orig: T, update: Partial<T>): T => {
    const cloned = { ...orig, ...update };
    const id = getFieldId(orig);
    fieldIdMap.current.set(cloned, id);
    try {
      Object.defineProperty(cloned, '_builderId', {
        value: id,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore if non-extensible
    }
    return cloned;
  };

  const isNameManuallyEdited = (f: SectionTemplateField, id: string): boolean => {
    if (manuallyEditedIds.has(id)) {
      return true;
    }
    // If field already had a custom name differing from slugify(label)
    if (f.name && f.label && f.name !== slugify(f.label)) {
      return true;
    }
    return false;
  };

  const markManuallyEdited = (id: string) => {
    setManuallyEditedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleAddField = () => {
    const newField: SectionTemplateField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
    };
    onChange([...fields, newField]);
  };

  const handleRemoveField = (index: number) => {
    const next = fields.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleUpdateField = (index: number, updatedField: SectionTemplateField) => {
    const next = [...fields];
    next[index] = updatedField;
    onChange(next);
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    const field = fields[index];
    const id = getFieldId(field);
    const manual = isNameManuallyEdited(field, id);
    const newName = manual ? field.name : slugify(newLabel);

    handleUpdateField(
      index,
      cloneWithId(field, {
        label: newLabel,
        name: newName,
      })
    );
  };

  const handleNameChange = (index: number, newName: string) => {
    const field = fields[index];
    const id = getFieldId(field);
    markManuallyEdited(id);
    handleUpdateField(index, cloneWithId(field, { name: newName }));
  };

  const handleTypeChange = (index: number, newType: string) => {
    const field = fields[index];
    const updated: Partial<SectionTemplateField> = { type: newType };

    if (newType === 'select') {
      updated.options = field.options || [];
    } else {
      delete (field as any).options;
    }

    if (newType === 'list') {
      updated.fields = field.fields || [];
    } else {
      delete (field as any).fields;
    }

    handleUpdateField(index, cloneWithId(field, updated));
  };

  const handleRequiredChange = (index: number, checked: boolean) => {
    const field = fields[index];
    handleUpdateField(index, cloneWithId(field, { required: checked }));
  };

  // Subfield handlers
  const handleAddSubfield = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const currentSubfields = field.fields || [];
    const newSubfield: SectionTemplateField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
    };
    handleUpdateField(
      fieldIndex,
      cloneWithId(field, { fields: [...currentSubfields, newSubfield] })
    );
  };

  const handleRemoveSubfield = (fieldIndex: number, subIndex: number) => {
    const field = fields[fieldIndex];
    const currentSubfields = (field.fields || []).filter((_, i) => i !== subIndex);
    handleUpdateField(fieldIndex, cloneWithId(field, { fields: currentSubfields }));
  };

  const handleUpdateSubfield = (
    fieldIndex: number,
    subIndex: number,
    updatedSubfield: SectionTemplateField
  ) => {
    const field = fields[fieldIndex];
    const currentSubfields = [...(field.fields || [])];
    currentSubfields[subIndex] = updatedSubfield;
    handleUpdateField(fieldIndex, cloneWithId(field, { fields: currentSubfields }));
  };

  const handleSubfieldLabelChange = (
    fieldIndex: number,
    subIndex: number,
    newLabel: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const subId = getFieldId(subfield);
    const manual = isNameManuallyEdited(subfield, subId);
    const newName = manual ? subfield.name : slugify(newLabel);

    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, {
        label: newLabel,
        name: newName,
      })
    );
  };

  const handleSubfieldNameChange = (
    fieldIndex: number,
    subIndex: number,
    newName: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const subId = getFieldId(subfield);
    markManuallyEdited(subId);
    handleUpdateSubfield(fieldIndex, subIndex, cloneWithId(subfield, { name: newName }));
  };

  const handleSubfieldTypeChange = (
    fieldIndex: number,
    subIndex: number,
    newType: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const updated: Partial<SectionTemplateField> = { type: newType };

    if (newType === 'select') {
      updated.options = subfield.options || [];
    } else {
      delete (subfield as any).options;
    }

    handleUpdateSubfield(fieldIndex, subIndex, cloneWithId(subfield, updated));
  };

  const handleSubfieldRequiredChange = (
    fieldIndex: number,
    subIndex: number,
    checked: boolean
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, { required: checked })
    );
  };

  const handleSubfieldOptionsChange = (
    fieldIndex: number,
    subIndex: number,
    options: string[]
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, { options })
    );
  };

  return (
    <Box>
      {fields.length === 0 ? (
        <Box
          p="4"
          mb="3"
          style={{
            textAlign: 'center',
            border: '1px dashed var(--gray-6)',
            borderRadius: 'var(--radius-3)',
          }}
        >
          <Text size="2" color="gray">
            No fields defined yet. Click &quot;Add Field&quot; below to define template fields.
          </Text>
        </Box>
      ) : (
        <Flex direction="column" gap="3" mb="3">
          {fields.map((field, index) => {
            const fieldId = getFieldId(field);
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
                      onChange={(e) => handleLabelChange(index, e.target.value)}
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
                      onChange={(e) => handleNameChange(index, e.target.value)}
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
                      onValueChange={(val) => handleTypeChange(index, val)}
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
                      onCheckedChange={(checked) => handleRequiredChange(index, checked)}
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
                    onClick={() => handleRemoveField(index)}
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
                    onChange={(opts) =>
                      handleUpdateField(index, cloneWithId(field, { options: opts }))
                    }
                    disabled={disabled}
                  />
                )}

                {/* List Sub-fields Editor */}
                {isList && (
                  <Box mt="3" pt="3" style={{ borderTop: '1px solid var(--gray-4)' }}>
                    <Flex justify="between" align="center" mb="2">
                      <Text size="2" weight="bold">
                        List Sub-fields
                      </Text>
                      <Button
                        type="button"
                        size="1"
                        variant="soft"
                        onClick={() => handleAddSubfield(index)}
                        disabled={disabled}
                        aria-label="Add Sub-field"
                      >
                        <PlusIcon width="12" height="12" /> Add Sub-field
                      </Button>
                    </Flex>
                    {(!field.fields || field.fields.length === 0) ? (
                      <Text size="1" color="gray">
                        No sub-fields defined. Add sub-fields to configure items in this list.
                      </Text>
                    ) : (
                      <Flex direction="column" gap="2">
                        {field.fields.map((subfield, subIndex) => {
                          const subId = getFieldId(subfield);
                          const isSubSelect = subfield.type === 'select';

                          return (
                            <Card
                              key={subId}
                              size="1"
                              style={{
                                backgroundColor: 'var(--gray-2)',
                                border: '1px solid var(--gray-4)',
                              }}
                            >
                              <Flex
                                direction="row"
                                gap="2"
                                align="end"
                                wrap="wrap"
                              >
                                <Box style={{ flex: '1 1 150px' }}>
                                  <Text
                                    as="label"
                                    htmlFor={`sub-label-${index}-${subIndex}`}
                                    size="1"
                                    weight="medium"
                                    color="gray"
                                    mb="1"
                                    style={{ display: 'block' }}
                                  >
                                    Sub-field Label
                                  </Text>
                                  <TextField.Root
                                    id={`sub-label-${index}-${subIndex}`}
                                    size="1"
                                    value={subfield.label}
                                    onChange={(e) =>
                                      handleSubfieldLabelChange(
                                        index,
                                        subIndex,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Sub-field Label"
                                    aria-label="Sub-field Label"
                                    disabled={disabled}
                                  />
                                </Box>
                                <Box style={{ flex: '1 1 150px' }}>
                                  <Text
                                    as="label"
                                    htmlFor={`sub-name-${index}-${subIndex}`}
                                    size="1"
                                    weight="medium"
                                    color="gray"
                                    mb="1"
                                    style={{ display: 'block' }}
                                  >
                                    Sub-field Name
                                  </Text>
                                  <TextField.Root
                                    id={`sub-name-${index}-${subIndex}`}
                                    size="1"
                                    value={subfield.name}
                                    onChange={(e) =>
                                      handleSubfieldNameChange(
                                        index,
                                        subIndex,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Sub-field Name"
                                    aria-label="Sub-field Name"
                                    disabled={disabled}
                                  />
                                </Box>
                                <Box style={{ width: '130px' }}>
                                  <Text
                                    as="label"
                                    size="1"
                                    weight="medium"
                                    color="gray"
                                    mb="1"
                                    style={{ display: 'block' }}
                                  >
                                    Type
                                  </Text>
                                  <Select.Root
                                    value={subfield.type || 'text'}
                                    onValueChange={(val) =>
                                      handleSubfieldTypeChange(index, subIndex, val)
                                    }
                                    disabled={disabled}
                                  >
                                    <Select.Trigger
                                      aria-label="Sub-field Type"
                                      style={{ width: '100%' }}
                                    />
                                    <Select.Content>
                                      {SUBFIELD_TYPES.map((t) => (
                                        <Select.Item key={t.value} value={t.value}>
                                          {t.label}
                                        </Select.Item>
                                      ))}
                                    </Select.Content>
                                  </Select.Root>
                                </Box>
                                <Flex align="center" gap="1" pb="1">
                                  <Switch
                                    id={`sub-req-${index}-${subIndex}`}
                                    size="1"
                                    checked={Boolean(subfield.required)}
                                    onCheckedChange={(checked) =>
                                      handleSubfieldRequiredChange(
                                        index,
                                        subIndex,
                                        checked
                                      )
                                    }
                                    disabled={disabled}
                                    aria-label="Sub-field Required"
                                  />
                                  <Text
                                    as="label"
                                    htmlFor={`sub-req-${index}-${subIndex}`}
                                    size="1"
                                  >
                                    Req
                                  </Text>
                                </Flex>
                                <IconButton
                                  type="button"
                                  size="1"
                                  color="red"
                                  variant="ghost"
                                  onClick={() => handleRemoveSubfield(index, subIndex)}
                                  disabled={disabled}
                                  aria-label="Remove sub-field"
                                  title="Remove sub-field"
                                >
                                  <TrashIcon width="14" height="14" />
                                </IconButton>
                              </Flex>

                              {/* Subfield Select Options */}
                              {isSubSelect && (
                                <SelectOptionsEditor
                                  options={subfield.options}
                                  onChange={(opts) =>
                                    handleSubfieldOptionsChange(index, subIndex, opts)
                                  }
                                  disabled={disabled}
                                />
                              )}
                            </Card>
                          );
                        })}
                      </Flex>
                    )}
                  </Box>
                )}
              </Card>
            );
          })}
        </Flex>
      )}

      {/* Add Field Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddField}
        disabled={disabled}
        aria-label="Add Field"
      >
        <PlusIcon /> Add Field
      </Button>
    </Box>
  );
};

export default VisualFieldBuilder;
