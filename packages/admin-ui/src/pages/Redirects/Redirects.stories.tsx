import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Redirects } from './Redirects';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import type { Redirect } from './types';

const sampleRedirects: Redirect[] = [
  {
    id: 1,
    source_path: '/legacy-products.html',
    target_url: '/products',
    status_code: 301,
    notes: 'Legacy SEO site migration redirect',
    hit_count: 2480,
    created_at: '2026-01-15 10:00:00',
    updated_at: '2026-01-15 10:00:00',
  },
  {
    id: 2,
    source_path: '/spring-sale',
    target_url: '/pricing?utm_source=flier&utm_medium=qr',
    status_code: 302,
    notes: 'Spring 2026 marketing print campaign',
    hit_count: 412,
    created_at: '2026-03-01 12:00:00',
    updated_at: '2026-03-01 12:00:00',
  },
  {
    id: 3,
    source_path: '/blog/2024/old-article',
    target_url: '/post/old-article',
    status_code: 301,
    notes: 'Dated WordPress URL structure redirect',
    hit_count: 129,
    created_at: '2026-02-10 09:30:00',
    updated_at: '2026-02-10 09:30:00',
  },
];

const createQueryClient = (redirectsData: Redirect[] = []) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  client.setQueryData(['redirects'], redirectsData);
  client.setQueryData(['settings'], { canonical_origin: 'https://example.com' });
  return client;
};

const meta = {
  title: 'Pages/Redirects',
  component: Redirects,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Redirects>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/redirects']}>
        <WebMCPProvider>
          <Theme appearance="light" accentColor="cyan" radius="medium">
            <QueryClientProvider client={createQueryClient(sampleRedirects)}>
              <Story />
            </QueryClientProvider>
          </Theme>
        </WebMCPProvider>
      </MemoryRouter>
    ),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/redirects']}>
        <WebMCPProvider>
          <Theme appearance="light" accentColor="cyan" radius="medium">
            <QueryClientProvider client={createQueryClient([])}>
              <Story />
            </QueryClientProvider>
          </Theme>
        </WebMCPProvider>
      </MemoryRouter>
    ),
  ],
};
