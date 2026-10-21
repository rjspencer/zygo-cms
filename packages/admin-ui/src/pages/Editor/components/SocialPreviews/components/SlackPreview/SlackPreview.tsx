import React from 'react';
import { Box, Card, Flex, Text } from '@radix-ui/themes';
import { getPublicSiteUrl } from '../../../../../../utils/api';

export interface SlackPreviewProps {
  title: string;
  description: string;
  coverImage: string;
}

export const SlackPreview: React.FC<SlackPreviewProps> = ({
  title,
  description,
  coverImage,
}) => {
  return (
    <Card size="2">
      <Text size="1" weight="bold" color="gray" mb="2" style={{ display: 'block' }}>
        Slack Link Preview
      </Text>
      <Box
        p="3"
        style={{
          borderLeft: '4px solid var(--accent-9, #36C5F0)',
          backgroundColor: 'var(--gray-a2)',
          borderRadius: '0 var(--radius-2) var(--radius-2) 0',
        }}
      >
        <Flex justify="between" align="start" gap="3">
          <Box style={{ flex: 1 }}>
            <Text size="1" weight="medium" color="gray" mb="1" style={{ display: 'block' }}>
              Zygo CMS
            </Text>
            <Text size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              {title || 'Untitled'}
            </Text>
            <Text size="2" color="gray" style={{ display: 'block', lineHeight: 1.4 }}>
              {description || 'No description provided.'}
            </Text>
          </Box>
          {coverImage && (
            <Box
              style={{
                width: '80px',
                height: '80px',
                flexShrink: 0,
                borderRadius: 'var(--radius-2)',
                overflow: 'hidden',
              }}
            >
              <img
                src={getPublicSiteUrl(coverImage)}
                alt="Preview thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          )}
        </Flex>
      </Box>
    </Card>
  );
};
