import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Dashboard } from './Dashboard';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createQueryClient = (metrics?: any, entries?: any[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  if (metrics) {
    client.setQueryData(['dashboard'], metrics);
  }
  if (entries) {
    client.setQueryData(['entries'], entries);
  }

  return client;
};

const sampleMetrics = {
  post_count: 14,
  page_count: 6,
  doc_count: 8,
  media_count: 42,
};

const sampleEntries = [
  {
    id: 1,
    title: 'Welcome to Zygo CMS',
    type: 'post',
    slug: 'welcome',
    status: 'published',
    created_at: '2026-03-01 12:00:00',
  },
  {
    id: 2,
    title: 'About Us',
    type: 'page',
    slug: '/about',
    status: 'published',
    created_at: '2026-03-02 15:30:00',
  },
  {
    id: 3,
    title: 'Draft Announcement',
    type: 'post',
    slug: 'announcement',
    status: 'draft',
    created_at: '2026-03-05 09:15:00',
  },
];

const meta = {
  title: 'Pages/Dashboard',
  component: Dashboard,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(sampleMetrics, sampleEntries)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider
            client={createQueryClient({ post_count: 0, page_count: 0, doc_count: 0, media_count: 0 }, [])}
          >
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
