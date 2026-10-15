import React from 'react';
import { Box, Text } from '@radix-ui/themes';
import { useAnalyticsData } from './hooks';
import {
  AnalyticsHeader,
  AnalyticsDisabledCard,
  AnalyticsMetricsGrid,
  AnalyticsDistributionCard,
} from './components';

export const Analytics: React.FC = () => {
  const { metrics, isLoading, isError, isAnalyticsDisabled } = useAnalyticsData();

  return (
    <Box>
      <AnalyticsHeader isAnalyticsDisabled={isAnalyticsDisabled} />

      {isLoading ? (
        <Text>Loading metrics...</Text>
      ) : isAnalyticsDisabled ? (
        <AnalyticsDisabledCard />
      ) : isError ? (
        <Text color="red">Failed to load analytics data.</Text>
      ) : (
        <AnalyticsMetricsGrid metrics={metrics} />
      )}

      <AnalyticsDistributionCard />
    </Box>
  );
};

export default Analytics;
