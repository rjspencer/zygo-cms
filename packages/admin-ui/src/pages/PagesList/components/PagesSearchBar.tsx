import React from 'react';
import { Box, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export interface PagesSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const PagesSearchBar: React.FC<PagesSearchBarProps> = ({ value, onChange }) => {
  return (
    <Box mb="4">
      <TextField.Root
        placeholder="Search pages by title or slug..."
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

export default PagesSearchBar;
