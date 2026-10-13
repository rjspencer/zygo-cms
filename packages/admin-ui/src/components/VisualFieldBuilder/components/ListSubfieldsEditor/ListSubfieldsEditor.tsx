import React from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { ListSubfieldsEditorProps } from '../../types';
import { SubfieldCard } from '../SubfieldCard';

export const ListSubfieldsEditor: React.FC<ListSubfieldsEditorProps> = ({
  fieldIndex,
  subfields = [],
  disabled = false,
  onAddSubfield,
  onRemoveSubfield,
  onSubfieldLabelChange,
  onSubfieldNameChange,
  onSubfieldTypeChange,
  onSubfieldRequiredChange,
  onSubfieldOptionsChange,
  getFieldId,
}) => {
  return (
    <Box mt="3" pt="3" style={{ borderTop: '1px solid var(--gray-4)' }}>
      <Flex justify="between" align="center" mb="2">
        <Text size="2" weight="bold">
          List Sub-fields
        </Text>
        <Button
          type="button"
          size="1"
          variant="soft"
          onClick={() => onAddSubfield(fieldIndex)}
          disabled={disabled}
          aria-label="Add Sub-field"
        >
          <PlusIcon width="12" height="12" /> Add Sub-field
        </Button>
      </Flex>
      {subfields.length === 0 ? (
        <Text size="1" color="gray">
          No sub-fields defined. Add sub-fields to configure items in this list.
        </Text>
      ) : (
        <Flex direction="column" gap="2">
          {subfields.map((subfield, subIndex) => {
            const subId = getFieldId(subfield);
            return (
              <SubfieldCard
                key={subId}
                fieldIndex={fieldIndex}
                subIndex={subIndex}
                subfield={subfield}
                subId={subId}
                disabled={disabled}
                onSubfieldLabelChange={onSubfieldLabelChange}
                onSubfieldNameChange={onSubfieldNameChange}
                onSubfieldTypeChange={onSubfieldTypeChange}
                onSubfieldRequiredChange={onSubfieldRequiredChange}
                onSubfieldOptionsChange={onSubfieldOptionsChange}
                onRemoveSubfield={onRemoveSubfield}
              />
            );
          })}
        </Flex>
      )}
    </Box>
  );
};

export default ListSubfieldsEditor;
