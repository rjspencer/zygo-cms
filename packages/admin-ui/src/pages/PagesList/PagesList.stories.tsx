import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { PagesList } from './PagesList';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PageItem } from './types';

const createQueryClient = (pagesData?: PageItem[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (pagesData) {
    client.setQueryData(['entries', 'pages'], pagesData);
  }
  return client;
};

const samplePages: PageItem[] = [
  {
    id: 1,
    title: 'Home Page',
    slug: '/',
    status: 'published',
    updatedAt: '2026-03-01',
  },
  {
    id: 2,
    title: 'About Zygo',
    slug: '/about',
    status: 'published',
    updatedAt: '2026-03-02',
  },
  {
    id: 3,
    title: 'Pricing & Plans',
    slug: '/pricing',
    status: 'draft',
    updatedAt: '2026-03-05',
  },
  {
    id: 4,
    title: 'Careers (Under Review)',
    slug: '/careers',
    status: 'in_review',
    updatedAt: '2026-03-06',
  },
  {
    id: 5,
    title: 'Product Tour 2026',
    slug: '/tour',
    status: 'ready_for_publish',
    updatedAt: '2026-03-07',
  },
  {
    id: 6,
    title: 'Black Friday 2025 Promo',
    slug: '/promo/bf-2025',
    status: 'archived',
    updatedAt: '2025-12-01',
  },
];

const meta = {
  title: 'Pages/PagesList',
  component: PagesList,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PagesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/pages']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePages)}>
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
      <MemoryRouter initialEntries={['/pages']}>
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
      <MemoryRouter initialEntries={['/pages?q=Pricing']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePages)}>
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
      <MemoryRouter initialEntries={['/pages?status=in_review']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(samplePages)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
