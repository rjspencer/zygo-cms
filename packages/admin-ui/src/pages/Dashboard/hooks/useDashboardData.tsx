import { useQuery } from '@tanstack/react-query';
import {
  FileTextIcon,
  LayersIcon,
  ImageIcon,
  ActivityLogIcon,
} from '@radix-ui/react-icons';
import { apiFetch, getPublicSiteUrl } from '../../../utils/api';
import type {
  DashboardApiResponse,
  DashboardMetricItem,
  EdgeStatus,
  RecentEntryItem,
  UseDashboardDataReturn,
} from '../types';

export function useDashboardData(): UseDashboardDataReturn {
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch entries');
      return res.json();
    },
  });

  const { data: metricsData = {}, isLoading: metricsLoading } = useQuery<DashboardApiResponse>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
  });

  const publicSiteUrl = getPublicSiteUrl();

  const { data: edgeStatus = 'Checking...' } = useQuery<EdgeStatus>({
    queryKey: ['edge-health', publicSiteUrl],
    queryFn: async (): Promise<EdgeStatus> => {
      try {
        const res = await fetch(publicSiteUrl, { method: 'GET' });
        if (res.status === 200) {
          return 'Operational';
        }
        return 'Degraded';
      } catch (_err) {
        return 'Offline';
      }
    },
    staleTime: 30000,
  });

  const totalPosts = metricsData.post_count || 0;
  const totalPages = metricsData.page_count || 0;
  const totalMedia = metricsData.media_count !== undefined ? metricsData.media_count : 0;

  const edgeColor: 'green' | 'gray' | 'amber' =
    edgeStatus === 'Operational'
      ? 'green'
      : edgeStatus === 'Checking...'
      ? 'gray'
      : 'amber';

  const metrics: DashboardMetricItem[] = [
    {
      title: 'Total Posts',
      value: totalPosts.toString(),
      icon: <FileTextIcon width="20" height="20" />,
      color: 'crimson',
    },
    {
      title: 'Total Pages',
      value: totalPages.toString(),
      icon: <LayersIcon width="20" height="20" />,
      color: 'cyan',
    },
    {
      title: 'Media Files',
      value: totalMedia.toString(),
      icon: <ImageIcon width="20" height="20" />,
      color: 'amber',
    },
    {
      title: 'Edge Status',
      value: edgeStatus,
      icon: <ActivityLogIcon width="20" height="20" />,
      color: edgeColor,
    },
  ];

  const recentEntries: RecentEntryItem[] = entries.slice(0, 5).map((e: any) => {
    const entryPath = e.type === 'page' ? (e.slug || '') : `/post/${e.slug || ''}`;
    const liveUrl = getPublicSiteUrl(entryPath);
    return {
      id: e.id,
      title: e.title,
      type: e.type,
      status: e.status,
      liveUrl,
      date: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
    };
  });

  return {
    metrics,
    recentEntries,
    isLoading: entriesLoading || metricsLoading,
  };
}
