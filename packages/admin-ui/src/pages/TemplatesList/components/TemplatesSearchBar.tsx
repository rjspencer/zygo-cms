import React from 'react';
import { Box, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

interface TemplatesSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const TemplatesSearchBar: React.FC<TemplatesSearchBarProps> = ({ value, onChange }) => {
  return (
    <Box mb="4">
      <TextField.Root
        id="templates-search-input"
        aria-label="Search templates by name, slug, or description"
        placeholder="Search templates by name, slug, or description..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height="16" width="16" />
        </TextField.Slot>
      </TextField.Root>
    </Box>
  );
};
