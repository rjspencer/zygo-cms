import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  TextField,
  IconButton,
} from '@radix-ui/themes';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { SelectOptionsEditorProps } from '../../types';

export const SelectOptionsEditor: React.FC<SelectOptionsEditorProps> = ({
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

export default SelectOptionsEditor;
