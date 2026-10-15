import React from 'react';
import { Card, Heading, Box, Text, TextField, TextArea } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import type { SettingsFormValues } from '../types';

export const GeneralSettingsCard: React.FC = () => {
  const { register } = useFormContext<SettingsFormValues>();

  return (
    <Card size="2">
      <Heading size="3" mb="3">
        General Information
      </Heading>

      <Box mb="4">
        <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Site Title
        </Text>
        <TextField.Root
          {...register('siteTitle')}
          placeholder="e.g. My Awesome Site"
        />
      </Box>

      <Box mb="4">
        <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Canonical Origin
        </Text>
        <TextField.Root
          {...register('canonicalOrigin')}
          placeholder="https://example.com"
        />
        <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
          Used to generate canonical URLs, Open Graph tags, and sitemap entries.
        </Text>
      </Box>

      <Box mb="2">
        <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Meta Description
        </Text>
        <TextArea
          {...register('description')}
          placeholder="Default description for search engines..."
        />
      </Box>
    </Card>
  );
};
