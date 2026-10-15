import React from 'react';
import { Card, Grid, Heading, Text } from '@radix-ui/themes';
import type { AnalyticsMetrics } from '../types';

interface AnalyticsMetricsGridProps {
  metrics: AnalyticsMetrics;
}

export const AnalyticsMetricsGrid: React.FC<AnalyticsMetricsGridProps> = ({ metrics }) => {
  const { totalViews, topPath, topCountry, uniquePaths } = metrics;

  return (
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
  );
};
