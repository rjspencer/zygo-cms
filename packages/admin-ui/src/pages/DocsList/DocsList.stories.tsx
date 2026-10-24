import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { DocsList } from './DocsList';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { DocItem } from './types';

const createQueryClient = (docsData?: DocItem[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (docsData) {
    client.setQueryData(['entries', 'docs'], docsData);
  }
  return client;
};

const sampleDocs: DocItem[] = [
  {
    id: 1,
    title: 'Introduction',
    slug: 'intro',
    path: '/docs/intro',
    status: 'published',
    updatedAt: '2026-03-01',
    parent_id: null,
    sort_order: 1,
  },
  {
    id: 2,
    title: 'Getting Started',
    slug: 'getting-started',
    path: '/docs/intro/getting-started',
    status: 'published',
    updatedAt: '2026-03-02',
    parent_id: 1,
    sort_order: 1,
  },
  {
    id: 3,
    title: 'Advanced Guides',
    slug: 'advanced',
    path: '/docs/advanced',
    status: 'draft',
    updatedAt: '2026-03-05',
    parent_id: null,
    sort_order: 2,
  },
  {
    id: 4,
    title: 'Architecture Review (Pending)',
    slug: 'arch-review',
    path: '/docs/arch-review',
    status: 'in_review',
    updatedAt: '2026-03-06',
    parent_id: null,
    sort_order: 3,
  },
  {
    id: 5,
    title: 'Deployment Checklist v2',
    slug: 'deploy-v2',
    path: '/docs/deploy-v2',
    status: 'ready_for_publish',
    updatedAt: '2026-03-07',
    parent_id: null,
    sort_order: 4,
  },
  {
    id: 6,
    title: 'Legacy SDK v0.9 (Deprecated)',
    slug: 'legacy-sdk',
    path: '/docs/legacy-sdk',
    status: 'archived',
    updatedAt: '2025-11-20',
    parent_id: null,
    sort_order: 5,
  },
];

const meta = {
  title: 'Pages/DocsList',
  component: DocsList,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DocsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/docs']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(sampleDocs)}>
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
      <MemoryRouter initialEntries={['/docs']}>
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
      <MemoryRouter initialEntries={['/docs?q=Getting']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(sampleDocs)}>
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
      <MemoryRouter initialEntries={['/docs?status=in_review']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(sampleDocs)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
