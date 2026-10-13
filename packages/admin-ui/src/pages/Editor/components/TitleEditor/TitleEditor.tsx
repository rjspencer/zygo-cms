import React, { useState } from 'react';
import { Box, Flex, Heading, IconButton, TextField } from '@radix-ui/themes';
import { CheckIcon, Cross2Icon, Pencil1Icon } from '@radix-ui/react-icons';
import { useFormContext, useWatch } from 'react-hook-form';
import type { EntryFormValues } from '../../types';
import { slugify } from '../../utils/slugify';

interface TitleEditorProps {
  /** New entries start in edit mode, and always derive their slug from the committed title. */
  isNewEntry: boolean;
}

/**
 * Inline-editable title. The form's `title` field is updated live while typing;
 * Cancel restores the title captured when editing began.
 */
export const TitleEditor: React.FC<TitleEditorProps> = ({ isNewEntry }) => {
  const { register, setValue, getValues, control } = useFormContext<EntryFormValues>();
  const title = useWatch({ control, name: 'title' });
  const [isEditing, setIsEditing] = useState(isNewEntry);
  const [committedTitle, setCommittedTitle] = useState(title);

  const fillSlugFromTitle = () => {
    const { title: current, slug } = getValues();
    if (!slug.trim() && current.trim()) setValue('slug', slugify(current), { shouldDirty: true });
  };

  const handleStart = () => {
    setCommittedTitle(title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValue('title', committedTitle, { shouldDirty: true });
    setIsEditing(false);
  };

  const handleSave = () => {
    const { title: current, slug } = getValues();
    if (isNewEntry || !slug) setValue('slug', slugify(current), { shouldDirty: true });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Flex align="center" gap="2" style={{ minHeight: '40px' }}>
        <Box style={{ flex: 1 }}>
          <TextField.Root
            size="3"
            placeholder="Enter title here..."
            {...register('title', { onBlur: fillSlugFromTitle })}
            onKeyDown={handleKeyDown}
            aria-label="Title"
            autoFocus
            style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
          />
        </Box>
        <IconButton
          style={{ cursor: 'pointer' }}
          size="2"
          variant="soft"
          color="green"
          aria-label="Save title"
          title="Save title"
          onClick={handleSave}
        >
          <CheckIcon width="18" height="18" />
        </IconButton>
        <IconButton
          style={{ cursor: 'pointer' }}
          size="2"
          variant="soft"
          color="gray"
          aria-label="Cancel"
          title="Cancel"
          onClick={handleCancel}
        >
          <Cross2Icon width="18" height="18" />
        </IconButton>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="2" style={{ minHeight: '40px' }}>
      <Heading
        size="6"
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          lineHeight: '30px',
          padding: '5px 0',
          boxSizing: 'border-box',
          margin: 0,
          color: title ? undefined : 'var(--gray-9)',
        }}
      >
        {title || 'Untitled'}
      </Heading>
      <IconButton
        style={{ cursor: 'pointer' }}
        size="2"
        variant="ghost"
        color="gray"
        aria-label="Edit title"
        title="Edit title"
        onClick={handleStart}
      >
        <Pencil1Icon width="18" height="18" />
      </IconButton>
    </Flex>
  );
};
