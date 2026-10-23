import React from 'react';

export type EdgeStatus = 'Operational' | 'Degraded' | 'Offline' | 'Checking...';

export interface DashboardMetricItem {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'crimson' | 'cyan' | 'blue' | 'amber' | 'green' | 'gray';
}

export interface RecentEntryItem {
  id: number;
  title: string;
  type: string;
  status: string;
  liveUrl: string;
  date: string;
}

export interface DashboardApiResponse {
  post_count?: number;
  page_count?: number;
  doc_count?: number;
  media_count?: number;
}

export interface UseDashboardDataReturn {
  metrics: DashboardMetricItem[];
  recentEntries: RecentEntryItem[];
  isLoading: boolean;
}
