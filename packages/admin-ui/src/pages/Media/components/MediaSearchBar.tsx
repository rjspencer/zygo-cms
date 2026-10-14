import React from 'react';
import { Card, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { MediaSearchBarProps } from '../types';

export const MediaSearchBar: React.FC<MediaSearchBarProps> = ({
  search,
  onSearchChange,
}) => {
  return (
    <Card size="2" mb="4">
      <TextField.Root
        placeholder="Search media by filename..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height="16" width="16" />
        </TextField.Slot>
      </TextField.Root>
    </Card>
  );
};
