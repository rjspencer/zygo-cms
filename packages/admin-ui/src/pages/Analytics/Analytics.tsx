import React from 'react';
import { Box, Text, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useAnalyticsData } from './hooks';
import {
  AnalyticsHeader,
  AnalyticsDisabledCard,
  AnalyticsMissingCredentialsCard,
  AnalyticsMetricsGrid,
  AnalyticsDistributionCard,
} from './components';

export const Analytics: React.FC = () => {
  const {
    metrics,
    isLoading,
    isError,
    errorMessage,
    isAnalyticsDisabled,
    isMissingCredentials,
    isRumConfigured,
  } = useAnalyticsData();

  return (
    <Box>
      <AnalyticsHeader isAnalyticsDisabled={isAnalyticsDisabled} />

      {isLoading ? (
        <Text>Loading metrics...</Text>
      ) : isAnalyticsDisabled ? (
        <AnalyticsDisabledCard />
      ) : isMissingCredentials ? (
        <AnalyticsMissingCredentialsCard />
      ) : isError ? (
        <Callout.Root color="red" mb="5" role="alert">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text as="span" style={{ display: 'block' }}>
              Failed to load analytics data.
            </Text>
            {errorMessage ? (
              <Text as="span" size="1" color="gray" style={{ display: 'block', marginTop: 4 }}>
                {errorMessage}
              </Text>
            ) : null}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <AnalyticsMetricsGrid
          metrics={metrics}
          isRumConfigured={isRumConfigured}
        />
      )}

      <AnalyticsDistributionCard />
    </Box>
  );
};

export default Analytics;
