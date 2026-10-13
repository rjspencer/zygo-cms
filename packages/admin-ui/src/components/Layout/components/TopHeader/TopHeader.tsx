import React from 'react';
import { Flex, Box, Text, Button } from '@radix-ui/themes';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { getPublicSiteUrl } from '../../../../utils/api';

export interface TopHeaderProps {
  externalBridgeEnabled: boolean;
  onOpenAssistant: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  externalBridgeEnabled,
  onOpenAssistant,
}) => {
  return (
    <Flex
      align="center"
      justify="between"
      px="5"
      py="3"
      style={{
        borderBottom: '1px solid var(--gray-a4)',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <Flex align="center" gap="3">
        <Text size="2" color="gray">
          Zygo CMS &gt; Admin Console
        </Text>
      </Flex>

      <Flex align="center" gap="3">
        <Button
          size="1"
          variant="outline"
          color="cyan"
          aria-label="Open WebMCP Assistant"
          onClick={onOpenAssistant}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Box
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: externalBridgeEnabled ? 'var(--green-9)' : 'var(--cyan-9)',
            }}
          />
          WebMCP
        </Button>

        <a
          href={getPublicSiteUrl()}
          data-testid="view-live-site-link"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
        >
          <Button size="1" variant="ghost" color="gray">
            <ExternalLinkIcon width="14" height="14" />
            View Live Site
          </Button>
        </a>
      </Flex>
    </Flex>
  );
};

export default TopHeader;
