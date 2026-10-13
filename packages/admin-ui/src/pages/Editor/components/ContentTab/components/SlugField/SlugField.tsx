import React from 'react';
import { Box, Text, TextField } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import { ENTRY_TYPE_CONFIG } from '../../../../constants';
import type { EntryFormValues, EntryType } from '../../../../types';

export interface SlugFieldProps {
  entryType: EntryType;
}

export const SlugField: React.FC<SlugFieldProps> = ({ entryType }) => {
  const { register } = useFormContext<EntryFormValues>();

  return (
    <Box>
      <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Slug
      </Text>
      <TextField.Root
        size="2"
        placeholder="url-friendly-slug"
        {...register('slug')}
      >
        <TextField.Slot>
          <Text size="1" color="gray">
            /{ENTRY_TYPE_CONFIG[entryType].slugPrefix}
          </Text>
        </TextField.Slot>
      </TextField.Root>
    </Box>
  );
};
