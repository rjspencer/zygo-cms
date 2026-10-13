import React from 'react';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useFormContext, useWatch } from 'react-hook-form';
import type { EntryFormValues, EntryType } from '../../types';
import { GoogleResultPreview } from './components/GoogleResultPreview/GoogleResultPreview';
import { SlackPreview } from './components/SlackPreview/SlackPreview';
import { IMessagePreview } from './components/IMessagePreview/IMessagePreview';

export interface SocialPreviewsProps {
  entryType: EntryType;
}

export const SocialPreviews: React.FC<SocialPreviewsProps> = ({ entryType }) => {
  const { control } = useFormContext<EntryFormValues>();

  const title = useWatch({ control, name: 'title' }) || '';
  const slug = useWatch({ control, name: 'slug' }) || '';
  const description = useWatch({ control, name: 'description' }) || '';
  const coverImage = useWatch({ control, name: 'coverImage' }) || '';

  return (
    <>
      <Box mb="4">
        <Heading size="3" mb="1">
          Search & Social Previews
        </Heading>
        <Text size="2" color="gray">
          Visual preview of how your content appears when shared across platforms.
        </Text>
      </Box>

      <Flex direction="column" gap="4">
        <GoogleResultPreview
          entryType={entryType}
          slug={slug}
          title={title}
          description={description}
        />
        <SlackPreview
          title={title}
          description={description}
          coverImage={coverImage}
        />
        <IMessagePreview
          title={title}
          coverImage={coverImage}
        />
      </Flex>
    </>
  );
};
