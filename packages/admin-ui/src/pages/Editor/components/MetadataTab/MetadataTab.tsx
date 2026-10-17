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
  const {
    register,
    formState: { errors },
  } = useFormContext<EntryFormValues>();

  return (
    <>
      <Flex direction="column" gap="4">
        <StatusField />

        <Box>
          <Text as="label" htmlFor="editor-tags-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Tags (comma separated)
          </Text>
          <TextField.Root
            id="editor-tags-input"
            size="2"
            placeholder="tech, news"
            {...register('tags')}
          />
        </Box>

        <Box>
          <Text as="label" htmlFor="editor-category-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Category
          </Text>
          <TextField.Root
            id="editor-category-input"
            size="2"
            placeholder="Category..."
            {...register('category')}
          />
        </Box>

        <CoverImageField />

        <Box>
          <Text as="label" htmlFor="editor-description-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Meta Description
          </Text>
          <TextArea
            id="editor-description-input"
            size="2"
            placeholder="Brief description for SEO..."
            {...register('description')}
          />
        </Box>

        {ENTRY_TYPE_CONFIG[entryType].hasHierarchy && <HierarchyFields />}

        <Box>
          <Text as="label" htmlFor="editor-canonical-url-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Canonical URL
          </Text>
          <TextField.Root
            id="editor-canonical-url-input"
            size="2"
            placeholder="https://example.com/..."
            aria-invalid={Boolean(errors.canonicalUrl)}
            aria-describedby={errors.canonicalUrl ? 'editor-canonical-url-error' : undefined}
            {...register('canonicalUrl')}
          />
          {errors.canonicalUrl?.message && (
            <Text id="editor-canonical-url-error" role="alert" size="1" color="red" mt="1" style={{ display: 'block' }}>
              {errors.canonicalUrl.message}
            </Text>
          )}
        </Box>

        <Box>
          <Text as="label" htmlFor="editor-schema-json-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Schema JSON
          </Text>
          <TextArea
            id="editor-schema-json-input"
            size="2"
            placeholder='{"@context": "https://schema.org", ...}'
            style={{ fontFamily: 'monospace' }}
            aria-invalid={Boolean(errors.schemaJson)}
            aria-describedby={errors.schemaJson ? 'editor-schema-json-error' : undefined}
            {...register('schemaJson')}
          />
          {errors.schemaJson?.message && (
            <Text id="editor-schema-json-error" role="alert" size="1" color="red" mt="1" style={{ display: 'block' }}>
              {errors.schemaJson.message}
            </Text>
          )}
        </Box>
      </Flex>

      <Separator size="4" my="5" />

      <SocialPreviews entryType={entryType} />
    </>
  );
};
