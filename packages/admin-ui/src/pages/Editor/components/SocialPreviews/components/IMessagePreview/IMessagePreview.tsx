import React from 'react';
import { Box, Card, Text } from '@radix-ui/themes';
import { getPublicSiteUrl } from '../../../../../../utils/api';

export interface IMessagePreviewProps {
  title: string;
  coverImage: string;
}

export const IMessagePreview: React.FC<IMessagePreviewProps> = ({
  title,
  coverImage,
}) => {
  return (
    <Card size="2">
      <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block' }}>
        iMessage Preview
      </Text>
      <Box
        style={{
          maxWidth: '340px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--gray-a3)',
          border: '1px solid var(--gray-a5)',
        }}
      >
        {coverImage && (
          <Box style={{ width: '100%', height: '170px', overflow: 'hidden' }}>
            <img
              src={getPublicSiteUrl(coverImage)}
              alt="Cover preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}
        <Box p="3">
          <Text size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            {title || 'Untitled'}
          </Text>
          <Text size="1" color="gray" style={{ display: 'block' }}>
            example.com
          </Text>
        </Box>
      </Box>
    </Card>
  );
};
