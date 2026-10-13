import React from 'react';
import { Box, Flex, Separator, Text, TextArea, TextField } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import { ENTRY_TYPE_CONFIG } from '../../constants';
import type { EntryFormValues, EntryType } from '../../types';
import { CoverImageField } from './components/CoverImageField/CoverImageField';
import { HierarchyFields } from './components/HierarchyFields/HierarchyFields';
import { StatusField } from './components/StatusField/StatusField';
import { SocialPreviews } from '../SocialPreviews/SocialPreviews';

export interface MetadataTabProps {
  entryType: EntryType;
}

export const MetadataTab: React.FC<MetadataTabProps> = ({ entryType }) => {
  const { register } = useFormContext<EntryFormValues>();

  return (
    <>
      <Flex direction="column" gap="4">
        <StatusField />

        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Tags (comma separated)
          </Text>
          <TextField.Root
            size="2"
            placeholder="tech, news"
            {...register('tags')}
          />
        </Box>

        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Category
          </Text>
          <TextField.Root
            size="2"
            placeholder="Category..."
            {...register('category')}
          />
        </Box>

        <CoverImageField />

        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Meta Description
          </Text>
          <TextArea
            size="2"
            placeholder="Brief description for SEO..."
            {...register('description')}
          />
        </Box>

        {ENTRY_TYPE_CONFIG[entryType].hasHierarchy && <HierarchyFields />}

        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Canonical URL
          </Text>
          <TextField.Root
            size="2"
            placeholder="https://example.com/..."
            {...register('canonicalUrl')}
          />
        </Box>

        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Schema JSON
          </Text>
          <TextArea
            size="2"
            placeholder='{"@context": "https://schema.org", ...}'
            style={{ fontFamily: 'monospace' }}
            {...register('schemaJson')}
          />
        </Box>
      </Flex>

      <Separator size="4" my="5" />

      <SocialPreviews entryType={entryType} />
    </>
  );
};
