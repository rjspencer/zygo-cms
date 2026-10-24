import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { PostsList } from './PostsList';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PostItem } from './types';

const createQueryClient = (postsData?: PostItem[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (postsData) {
    client.setQueryData(['entries', 'posts'], postsData);
  }
  return client;
};

const samplePosts: PostItem[] = [
  {
    id: 1,
    title: 'Announcing Zygo CMS v1.0',
    slug: 'announcing-zygo-cms-v1',
    status: 'published',
    date: '2026-03-01',
  },
  {
    id: 2,
    title: 'Deploying High-Performance Rust on Cloudflare Workers',
    slug: 'deploying-rust-on-cloudflare-workers',
    status: 'published',
    date: '2026-03-05',
  },
  {
    id: 3,
    title: 'Draft: Building a Dynamic Edge Blog',
    slug: 'building-a-dynamic-edge-blog',
    status: 'draft',
    date: '2026-03-10',
  },
  {
    id: 4,
    title: 'Scheduled: The Future of Edge Computing',
    slug: 'the-future-of-edge-computing',
    status: 'scheduled',
    date: '2026-04-01',
  },
  {
    id: 5,
    title: 'Editorial: Custom Workflow Statuses Spec',
    slug: 'custom-workflow-statuses-spec',
    status: 'in_review',
    date: '2026-04-05',
  },
  {
    id: 6,
    title: 'Release Notes: Zygo Admin UI v2',
    slug: 'release-notes-zygo-admin-ui-v2',
    status: 'ready_for_publish',
    date: '2026-04-08',
  },
  {
    id: 7,
    title: 'Deprecated: Legacy Section Rendering',
    slug: 'deprecated-legacy-section-rendering',
    status: 'archived',
    date: '2026-01-15',
  },
];

const meta = {
  title: 'Pages/PostsList',
  component: PostsList,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PostsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/posts']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePosts)}>
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
      <MemoryRouter initialEntries={['/posts']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient([])}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const FilteredBySearch: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/posts?q=Draft']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePosts)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const FilteredByInReview: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/posts?status=in_review']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePosts)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
