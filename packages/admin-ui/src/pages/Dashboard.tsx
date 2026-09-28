import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@radix-ui/react-icons';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>({});
  const [, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [entriesRes, metricsRes] = await Promise.all([
          fetch('/api/entries'),
          fetch('/api/admin/dashboard')
        ]);
        if (entriesRes.ok && metricsRes.ok) {
          const entriesData = await entriesRes.json();
          const mData = await metricsRes.json();
          setEntries(entriesData);
          setMetricsData(mData);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const totalPosts = metricsData.post_count || 0;
  const totalPages = metricsData.page_count || 0;
  
  const metrics = [
    { title: 'Total Posts', value: totalPosts.toString(), icon: <FileTextIcon width="20" height="20" />, color: 'iris' as const },
    { title: 'Total Pages', value: totalPages.toString(), icon: <LayersIcon width="20" height="20" />, color: 'blue' as const },
    { title: 'Media Files', value: 'N/A', icon: <ImageIcon width="20" height="20" />, color: 'amber' as const },
    { title: 'Edge Status', value: 'Operational', icon: <ActivityLogIcon width="20" height="20" />, color: 'green' as const },
  ];

  const recentEntries = entries.slice(0, 5).map((e: any) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    status: e.status,
    date: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
  }));

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
          <Button variant="solid" color="iris" onClick={() => navigate('/editor?type=post')}>
            <PlusIcon width="16" height="16" />
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
            {recentEntries.map((entry) => (
              <Table.Row key={entry.id}>
                <Table.RowHeaderCell>
                  <Text weight="medium">{entry.title}</Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Badge variant="outline" color={entry.type === 'post' ? 'iris' : 'blue'}>
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
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => navigate(`/editor/${entry.id}`)}
                    title="Edit"
                  >
                    <Pencil1Icon width="16" height="16" />
                  </IconButton>
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
