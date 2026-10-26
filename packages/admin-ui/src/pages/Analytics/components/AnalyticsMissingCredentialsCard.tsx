import React from 'react';
import { Card, Flex, Heading, Text, Button, Box, Code } from '@radix-ui/themes';
import { GearIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router-dom';

export const AnalyticsMissingCredentialsCard: React.FC = () => {
  return (
    <Card size="3" mb="5">
      <Flex direction="column" gap="4" align="start">
        <Box>
          <Heading size="4" mb="1">
            Cloudflare Analytics Not Configured
          </Heading>
          <Text size="2" color="gray">
            Analytics is enabled, but the required Cloudflare credentials have not been configured yet.
          </Text>
        </Box>

        <Box>
          <Text size="2" weight="bold" mb="2" style={{ display: 'block' }}>
            Required Configuration:
          </Text>
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              1. <strong>Worker Secrets</strong>: Set <Code>CF_API_TOKEN</Code>, <Code>CF_ZONE_ID</Code> (for Edge HTTP analytics), and <Code>CF_ACCOUNT_ID</Code> (for RUM analytics) in your Cloudflare Worker environment secrets.
            </Text>
            <Text size="2" color="gray">
              2. <strong>Site Settings</strong>: Set your Cloudflare Web Analytics Site Tag in Site Settings to inject the client-side tracking beacon.
            </Text>
          </Flex>
        </Box>

        <Flex gap="3" wrap="wrap">
          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <Button size="2" variant="solid" color="cyan">
              <GearIcon width="16" height="16" />
              Configure in Site Settings
            </Button>
          </Link>
          <a
            href="https://dash.cloudflare.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Button size="2" variant="soft" color="gray">
              <ExternalLinkIcon width="16" height="16" />
              Cloudflare Dashboard
            </Button>
          </a>
        </Flex>
      </Flex>
    </Card>
  );
};
