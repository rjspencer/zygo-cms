import React from 'react';
import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { BarChartIcon } from '@radix-ui/react-icons';

export const AnalyticsDistributionCard: React.FC = () => {
  return (
    <Card size="3">
      <Flex align="center" gap="2" mb="3">
        <BarChartIcon width="20" height="20" />
        <Heading size="4">Edge Distribution</Heading>
      </Flex>
      <Text size="2" color="gray" mb="4">
        Cloudflare Workers routing traffic across 300+ global edge locations. Static assets and cached HTML
        pages are delivered at sub-30ms latencies worldwide.
      </Text>
    </Card>
  );
};
