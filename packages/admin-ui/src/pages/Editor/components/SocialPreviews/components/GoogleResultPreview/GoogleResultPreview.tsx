import React from 'react';
import { Box, Heading, Text, Card } from '@radix-ui/themes';
import type { EntryType } from '../../../../types';

export interface GoogleResultPreviewProps {
  entryType: EntryType;
  slug: string;
  title: string;
  description: string;
}

export const GoogleResultPreview: React.FC<GoogleResultPreviewProps> = ({
  entryType,
  slug,
  title,
  description,
}) => {
  const urlPath =
    entryType === 'page'
      ? slug || 'slug'
      : entryType === 'doc'
      ? `docs › ${slug || 'slug'}`
      : `post › ${slug || 'slug'}`;

  return (
    <Card size="2">
      <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block' }}>
        Google Search Result
      </Text>
      <Box style={{ fontFamily: 'Arial, sans-serif' }}>
        <Text size="1" color="gray" style={{ display: 'block', marginBottom: '2px', wordBreak: 'break-all' }}>
          {`https://example.com › ${urlPath}`}
        </Text>
        <Heading
          size="3"
          weight="medium"
          style={{
            color: 'var(--blue-11, #1a0dab)',
            marginBottom: '4px',
          }}
        >
          {`${title || 'Untitled'} | Zygo CMS`}
        </Heading>
        <Text size="2" color="gray" style={{ display: 'block', lineHeight: 1.4 }}>
          {description || 'Add a meta description to see how this page will appear in search results...'}
        </Text>
      </Box>
    </Card>
  );
};
