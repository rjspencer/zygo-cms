import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Media } from './Media';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { MediaItem } from './types';

const mockMediaItems: MediaItem[] = [
  {
    id: 'photo-1.jpg',
    name: 'photo-1.jpg',
    size: '2 KB',
    type: 'image/jpeg',
    url: '/media/photo-1.jpg',
    uploadedAt: '2026-09-27',
  },
  {
    id: 'banner.png',
    name: 'banner.png',
    size: '2.00 MB',
    type: 'image/png',
    url: '/media/banner.png',
    uploadedAt: '2026-09-26',
  },
  {
    id: 'hero-video.mp4',
    name: 'hero-video.mp4',
    size: '8.40 MB',
    type: 'video/mp4',
    url: '/media/hero-video.mp4',
    uploadedAt: '2026-09-25',
  },
];

const createQueryClient = (items?: MediaItem[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (items) {
    client.setQueryData(['media'], items);
  }
  return client;
};

const meta = {
  title: 'Pages/Media',
  component: Media,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Media>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/media']}>
        <QueryClientProvider client={createQueryClient(mockMediaItems)}>
          <Theme>
            <Story />
          </Theme>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/media']}>
        <QueryClientProvider client={createQueryClient([])}>
          <Theme>
            <Story />
          </Theme>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ],
};

export const Filtered: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/media?q=banner']}>
        <QueryClientProvider client={createQueryClient(mockMediaItems)}>
          <Theme>
            <Story />
          </Theme>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ],
};
