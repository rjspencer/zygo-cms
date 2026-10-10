import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, getPublicSiteUrl } from '../utils/api';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Grid,
  Table,
  Badge,
  IconButton,
} from '@radix-ui/themes';
import {
  PlusIcon,
  FileTextIcon,
  LayersIcon,
  ImageIcon,
  Pencil1Icon,
  ActivityLogIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch entries');
      return res.json();
    },
  });

  const { data: metricsData = {} } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
  });

  const publicSiteUrl = getPublicSiteUrl();

  type EdgeStatus = 'Operational' | 'Degraded' | 'Offline' | 'Checking...';

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
  
  const edgeColor =
    edgeStatus === 'Operational'
      ? ('green' as const)
      : edgeStatus === 'Checking...'
      ? ('gray' as const)
      : ('amber' as const);

  const metrics = [
    { title: 'Total Posts', value: totalPosts.toString(), icon: <FileTextIcon width="20" height="20" />, color: 'crimson' as const },
    { title: 'Total Pages', value: totalPages.toString(), icon: <LayersIcon width="20" height="20" />, color: 'cyan' as const },
    { title: 'Media Files', value: totalMedia.toString(), icon: <ImageIcon width="20" height="20" />, color: 'amber' as const },
    { title: 'Edge Status', value: edgeStatus, icon: <ActivityLogIcon width="20" height="20" />, color: edgeColor },
  ];

  const recentEntries = entries.slice(0, 5).map((e: any) => {
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

  return (
    <Box>
      {/* Page Title & Action */}
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Dashboard
          </Heading>
          <Text size="2" color="gray">
            Overview of your Zygo CMS content and edge operations
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="solid" color="cyan" onClick={() => navigate('/posts/editor/new')}>
            <PlusIcon width="18" height="18" />
            New Post
          </Button>
        </Flex>
      </Flex>

      {/* Metrics Grid */}
      <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="6">
        {metrics.map((m) => (
          <Card key={m.title} size="2">
            <Flex justify="between" align="start">
              <Box>
                <Text size="1" color="gray" weight="medium">
                  {m.title}
                </Text>
                <Heading size="6" mt="1">
                  {m.value}
                </Heading>
              </Box>
              <Badge color={m.color} variant="soft" size="2">
                {m.icon}
              </Badge>
            </Flex>
          </Card>
        ))}
      </Grid>

      {/* Recent Entries */}
      <Card size="2">
        <Flex justify="between" align="center" mb="4">
          <Box>
            <Heading size="4">Recent Content</Heading>
            <Text size="2" color="gray">
              Recently updated posts and pages
            </Text>
          </Box>
          <Button variant="ghost" size="2" onClick={() => navigate('/posts')}>
            View All
          </Button>
        </Flex>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {recentEntries.map((entry: any) => (
              <Table.Row key={entry.id}>
                <Table.RowHeaderCell>
                  <a
                    href={entry.liveUrl}
                    target="_self"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Text weight="medium">{entry.title}</Text>
                  </a>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Badge variant="outline" color={entry.type === 'post' ? 'crimson' : 'cyan'}>
                    {entry.type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={entry.status === 'published' ? 'green' : 'gray'}>
                    {entry.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {entry.date}
                  </Text>
                </Table.Cell>
                <Table.Cell style={{ textAlign: 'right' }}>
                  <Flex justify="end" gap="1">
                    <IconButton style={{ cursor: 'pointer' }} size="2"
                      variant="ghost"
                      color="gray"
                      asChild
                      title="View on Live Site"
                    >
                      <a href={entry.liveUrl} target="_self">
                        <ExternalLinkIcon width="18" height="18" />
                      </a>
                    </IconButton>
                    <IconButton style={{ cursor: 'pointer' }} size="2"
                      variant="ghost"
                      color="gray"
                      onClick={() => navigate(entry.type === 'page' ? `/pages/editor/${entry.id}` : `/posts/editor/${entry.id}`)}
                      title="Edit"
                    >
                      <Pencil1Icon width="18" height="18" />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default Dashboard;
