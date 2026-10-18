import React from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import type { EntryFormValues } from '../../../../types';

export const StatusField: React.FC = () => {
  const { watch, setValue } = useFormContext<EntryFormValues>();
  const status = watch('status');

  return (
    <Box>
      <Text as="div" id="editor-status-label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Status
      </Text>
      <Flex gap="2" role="group" aria-labelledby="editor-status-label">
        <Button
          type="button"
          size="1"
          variant={status === 'draft' ? 'solid' : 'soft'}
          color="gray"
          aria-pressed={status === 'draft'}
          onClick={() => setValue('status', 'draft', { shouldDirty: true })}
        >
          Draft
        </Button>
        <Button
          type="button"
          size="1"
          variant={status === 'published' ? 'solid' : 'soft'}
          color="green"
          aria-pressed={status === 'published'}
          onClick={() => setValue('status', 'published', { shouldDirty: true })}
        >
          Published
        </Button>
      </Flex>
    </Box>
  );
};
