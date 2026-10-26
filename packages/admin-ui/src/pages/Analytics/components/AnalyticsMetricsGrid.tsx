import React from 'react';
import { Box, Tabs, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router-dom';
import type { AnalyticsMetrics } from '../types';
import { RumMetricsTab } from './RumMetricsTab';
import { EdgeMetricsTab } from './EdgeMetricsTab';

interface AnalyticsMetricsGridProps {
  metrics: AnalyticsMetrics;
  isRumConfigured?: boolean;
  defaultTab?: string;
}

export const AnalyticsMetricsGrid: React.FC<AnalyticsMetricsGridProps> = ({
  metrics,
  isRumConfigured = true,
  defaultTab,
}) => {
  const initialTab = defaultTab || (isRumConfigured ? 'rum' : 'edge');

  const rum = metrics.rum || {
    totalViews: metrics.totalViews,
    topPath: metrics.topPath,
    topCountry: metrics.topCountry,
    uniquePaths: metrics.uniquePaths,
    groups: [],
  };

  const edge = metrics.edge || {
    totalRequests: metrics.totalViews,
    totalBytes: 0,
    topPath: metrics.topPath,
    topCountry: metrics.topCountry,
    uniquePaths: metrics.uniquePaths,
    groups: [],
  };

  return (
    <Box mb="5">
      {!isRumConfigured && (
        <Callout.Root color="amber" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Cloudflare Web Analytics Site Tag is not configured. Configure your site tag in{' '}
            <Link to="/settings" style={{ color: 'inherit', fontWeight: 'bold' }}>
              Site Settings
            </Link>{' '}
            to enable privacy-friendly Real User Monitoring (RUM) visitor metrics.
          </Callout.Text>
        </Callout.Root>
      )}

      <Tabs.Root defaultValue={initialTab}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="rum">Visitor Traffic (RUM)</Tabs.Trigger>
          <Tabs.Trigger value="edge">Edge Infrastructure</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="rum">
          <RumMetricsTab rum={rum} />
        </Tabs.Content>

        <Tabs.Content value="edge">
          <EdgeMetricsTab edge={edge} />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};
