import React from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Card,
  Grid,
  Badge,
} from '@radix-ui/themes';
import {
  BarChartIcon,
  ActivityLogIcon,
} from '@radix-ui/react-icons';

export const Analytics: React.FC = () => {
  return (
    <Box style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Analytics &amp; Performance
          </Heading>
          <Text size="2" color="gray">
            Edge performance and Cloudflare analytics metrics
          </Text>
        </Box>
        <Badge size="2" color="green">
          <ActivityLogIcon /> Real-time Edge
        </Badge>
      </Flex>

      <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="5">
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            30-Day Requests
          </Text>
          <Heading size="6" mt="1">
            142.8k
          </Heading>
          <Text size="1" color="green" mt="1">
            +14% vs last month
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Cache Hit Ratio
          </Text>
          <Heading size="6" mt="1">
            94.2%
          </Heading>
          <Text size="1" color="green" mt="1">
            Served from edge cache
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Avg Edge Latency
          </Text>
          <Heading size="6" mt="1">
            18 ms
          </Heading>
          <Text size="1" color="gray" mt="1">
            Global median
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            D1 Database Queries
          </Text>
          <Heading size="6" mt="1">
            8.4k
          </Heading>
          <Text size="1" color="gray" mt="1">
            Cache misses only
          </Text>
        </Card>
      </Grid>

      <Card size="3">
        <Flex align="center" gap="2" mb="3">
          <BarChartIcon width="20" height="20" />
          <Heading size="4">Edge Distribution</Heading>
        </Flex>
        <Text size="2" color="gray" mb="4">
          Cloudflare Workers routing traffic across 300+ global edge locations. Static assets and cached HTML pages are delivered at sub-30ms latencies worldwide.
        </Text>
      </Card>
    </Box>
  );
};

export default Analytics;
