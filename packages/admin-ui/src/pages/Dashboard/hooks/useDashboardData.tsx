import { useQuery } from '@tanstack/react-query';
import {
  FileTextIcon,
  LayersIcon,
  ArchiveIcon,
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

  const totalPosts =
    metricsData.post_count !== undefined
      ? metricsData.post_count
      : entries.filter((e: any) => e.type === 'post').length;
  const totalPages =
    metricsData.page_count !== undefined
      ? metricsData.page_count
      : entries.filter((e: any) => e.type === 'page').length;
  const totalDocs =
    metricsData.doc_count !== undefined
      ? metricsData.doc_count
      : entries.filter((e: any) => e.type === 'doc').length;
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
      title: 'Total Docs',
      value: totalDocs.toString(),
      icon: <ArchiveIcon width="20" height="20" />,
      color: 'blue',
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
    const entryPath = e.path || (e.type === 'page' ? (e.slug || '') : e.type === 'doc' ? `/docs/${e.slug || ''}` : `/post/${e.slug || ''}`);
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
