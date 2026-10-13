import React from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import { useOpenMediaPicker } from '../../../../context/MediaPickerContext';
import type { EntryFormValues } from '../../../../types';

export const CoverImageField: React.FC = () => {
  const { watch, setValue } = useFormContext<EntryFormValues>();
  const coverImage = watch('coverImage');
  const openMediaPicker = useOpenMediaPicker();

  return (
    <Box>
      <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Cover Image URL
      </Text>
      <Flex align="center" gap="2" wrap="wrap">
        <Button
          type="button"
          variant="soft"
          color="cyan"
          onClick={() => openMediaPicker((url) => setValue('coverImage', url, { shouldDirty: true }))}
        >
          Select Image
        </Button>
        {coverImage && (
          <Flex align="center" gap="3">
            <Box style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-2)', overflow: 'hidden', flexShrink: 0 }}>
              <img src={coverImage} alt="Cover Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Text size="2" color="gray" style={{ wordBreak: 'break-all' }}>
              {coverImage}
            </Text>
            <Button
              type="button"
              variant="ghost"
              color="red"
              size="1"
              onClick={() => setValue('coverImage', '', { shouldDirty: true })}
            >
              Remove
            </Button>
          </Flex>
        )}
      </Flex>
    </Box>
  );
};
