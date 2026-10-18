import React from 'react';
import { Box, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export interface PostsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const PostsSearchBar: React.FC<PostsSearchBarProps> = ({ value, onChange }) => {
  return (
    <Box mb="4">
      <TextField.Root
        id="posts-search-input"
        aria-label="Search posts by title or slug"
        placeholder="Search posts by title or slug..."
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

export default PostsSearchBar;
