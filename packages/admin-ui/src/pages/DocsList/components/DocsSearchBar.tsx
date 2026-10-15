import React from 'react';
import { Box, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

interface DocsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const DocsSearchBar: React.FC<DocsSearchBarProps> = ({ value, onChange }) => {
  return (
    <Box mb="4">
      <TextField.Root
        placeholder="Search docs by title or slug..."
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
