import React from 'react';
import { Card, Flex, Heading, Text, Button } from '@radix-ui/themes';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

export const AnalyticsDisabledCard: React.FC = () => {
  return (
    <Card size="3" mb="5">
      <Flex direction="column" gap="3" align="start">
        <Heading size="4">Cloudflare Web Analytics Not Enabled</Heading>
        <Text size="2" color="gray">
          Web analytics is currently disabled for this site. To track visitor metrics and performance,
          enable Web Analytics in your Cloudflare dashboard and configure your credentials in Site Settings.
        </Text>
        <a
          href="https://dash.cloudflare.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <Button size="2" variant="solid" color="cyan">
            <ExternalLinkIcon width="18" height="18" />
            Cloudflare Dashboard
          </Button>
        </a>
      </Flex>
    </Card>
  );
};
