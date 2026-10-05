import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import {
  Flex,
  Box,
  Heading,
  Text,
  Card,
  Grid,
  Badge,
  Button,
} from '@radix-ui/themes';
import {
  BarChartIcon,
  ActivityLogIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';

export const Analytics: React.FC = () => {
  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiFetch('/api/analytics');
      if (res.status === 403) {
        return { disabled: true };
      }
      if (!res.ok) {
        const err = new Error('Failed to fetch analytics');
        (err as any).status = res.status;
        throw err;
      }
      return res.json();
    },
  });

  const isAnalyticsDisabled = Boolean(
    rawData?.disabled || (error as any)?.status === 403 || error?.message?.includes('403')
  );

  const events = rawData?.data?.viewer?.zones?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  
  const totalViews = events.reduce((acc: number, item: any) => acc + item.count, 0);
  const topPath = events.length > 0 ? events[0].dimensions.requestPath : 'N/A';
  const topCountry = events.length > 0 ? events[0].dimensions.clientCountryName : 'N/A';
  const uniquePaths = events.length;

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
        <Badge size="2" color={isAnalyticsDisabled ? 'gray' : 'green'}>
          {isAnalyticsDisabled ? 'Disabled' : <><ActivityLogIcon /> Real-time Edge</>}
        </Badge>
      </Flex>

      {isLoading ? (
        <Text>Loading metrics...</Text>
      ) : isAnalyticsDisabled ? (
        <Card size="3" mb="5">
          <Flex direction="column" gap="3" align="start">
            <Heading size="4">Cloudflare Web Analytics Not Enabled</Heading>
            <Text size="2" color="gray">
              Web analytics is currently disabled for this site. To track visitor metrics and performance, enable Web Analytics in your Cloudflare dashboard and configure your credentials in Site Settings.
            </Text>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button size="2" variant="solid" color="iris">
                <ExternalLinkIcon width="16" height="16" />
                Cloudflare Dashboard
              </Button>
            </a>
          </Flex>
        </Card>
      ) : isError ? (
        <Text color="red">Failed to load analytics data.</Text>
      ) : (
        <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="5">
          <Card size="2">
            <Text size="1" color="gray" weight="medium">
              Total Page Views
            </Text>
            <Heading size="6" mt="1">
              {totalViews > 0 ? `${(totalViews / 1000).toFixed(1)}k` : '0'}
            </Heading>
            <Text size="1" color="green" mt="1">
              Based on top {uniquePaths} paths
            </Text>
          </Card>
          <Card size="2">
            <Text size="1" color="gray" weight="medium">
              Top Request Path
            </Text>
            <Heading size="6" mt="1">
              {topPath}
            </Heading>
            <Text size="1" color="green" mt="1">
              Most visited
            </Text>
          </Card>
          <Card size="2">
            <Text size="1" color="gray" weight="medium">
              Top Country
            </Text>
            <Heading size="6" mt="1">
              {topCountry}
            </Heading>
            <Text size="1" color="gray" mt="1">
              Largest audience
            </Text>
          </Card>
          <Card size="2">
            <Text size="1" color="gray" weight="medium">
              Unique Paths Tracked
            </Text>
            <Heading size="6" mt="1">
              {uniquePaths}
            </Heading>
            <Text size="1" color="gray" mt="1">
              In top results
            </Text>
          </Card>
        </Grid>
      )}

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
