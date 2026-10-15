import React from 'react';
import { Box } from '@radix-ui/themes';
import { useDashboardData } from './hooks';
import {
  DashboardHeader,
  DashboardMetricsGrid,
  RecentEntriesTable,
} from './components';

export const Dashboard: React.FC = () => {
  const { metrics, recentEntries } = useDashboardData();

  return (
    <Box>
      <DashboardHeader />
      <DashboardMetricsGrid metrics={metrics} />
      <RecentEntriesTable entries={recentEntries} />
    </Box>
  );
};

export default Dashboard;
