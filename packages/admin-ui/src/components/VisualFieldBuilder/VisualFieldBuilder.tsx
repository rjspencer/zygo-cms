import React from 'react';
import { Box, Flex, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { VisualFieldBuilderProps } from './types';
import { useVisualFieldBuilder } from './hooks/useVisualFieldBuilder';
import { EmptyFieldsView } from './components/EmptyFieldsView';
import { FieldCard } from './components/FieldCard';

export const VisualFieldBuilder: React.FC<VisualFieldBuilderProps> = ({
  fields = [],
  onChange,
  disabled = false,
}) => {
  const {
    getFieldId,
    handleAddField,
    handleRemoveField,
    handleLabelChange,
    handleNameChange,
    handleTypeChange,
    handleRequiredChange,
    handleOptionsChange,
    handleAddSubfield,
    handleRemoveSubfield,
    handleSubfieldLabelChange,
    handleSubfieldNameChange,
    handleSubfieldTypeChange,
    handleSubfieldRequiredChange,
    handleSubfieldOptionsChange,
  } = useVisualFieldBuilder(fields, onChange);

  return (
    <Box>
      {fields.length === 0 ? (
        <EmptyFieldsView />
      ) : (
        <Flex direction="column" gap="3" mb="3">
          {fields.map((field, index) => {
            const fieldId = getFieldId(field);

            return (
              <FieldCard
                key={fieldId}
                field={field}
                index={index}
                fieldId={fieldId}
                disabled={disabled}
                onLabelChange={handleLabelChange}
                onNameChange={handleNameChange}
                onTypeChange={handleTypeChange}
                onRequiredChange={handleRequiredChange}
                onRemoveField={handleRemoveField}
                onOptionsChange={handleOptionsChange}
                onAddSubfield={handleAddSubfield}
                onRemoveSubfield={handleRemoveSubfield}
                onSubfieldLabelChange={handleSubfieldLabelChange}
                onSubfieldNameChange={handleSubfieldNameChange}
                onSubfieldTypeChange={handleSubfieldTypeChange}
                onSubfieldRequiredChange={handleSubfieldRequiredChange}
                onSubfieldOptionsChange={handleSubfieldOptionsChange}
                getFieldId={getFieldId}
              />
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
