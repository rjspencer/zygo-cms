import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Navigation } from './Navigation';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { MenuItem, SitePageItem } from './types';

const mockHeaderItems: MenuItem[] = [
  { title: 'Home', url: '/', target: '_self', children: [] },
  { title: 'Articles', url: '/posts', target: '_self', children: [] },
  { title: 'About Us', url: '/about', target: '_self', children: [] },
];

const mockFooterItems: MenuItem[] = [
  { title: 'Privacy Policy', url: '/privacy', target: '_self', children: [] },
  { title: 'Terms of Service', url: '/terms', target: '_self', children: [] },
];

const mockSitePages: SitePageItem[] = [
  { id: 1, title: 'About Us', path: '/about' },
  { id: 2, title: 'Contact', path: '/contact' },
  { id: 3, title: 'Pricing', path: '/pricing' },
];

const createQueryClient = (
  menusData?: { header?: { items_json: string }; footer?: { items_json: string } },
  pagesData?: SitePageItem[]
) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (menusData) {
    client.setQueryData(['menus'], menusData);
  }
  if (pagesData) {
    client.setQueryData(['entries', 'pages-nav'], pagesData);
  }
  return client;
};

const meta = {
  title: 'Pages/Navigation',
  component: Navigation,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/navigation']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider
            client={createQueryClient(
              {
                header: { items_json: JSON.stringify(mockHeaderItems) },
                footer: { items_json: JSON.stringify(mockFooterItems) },
              },
              mockSitePages
            )}
          >
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const FooterTab: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/navigation?tab=footer']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider
            client={createQueryClient(
              {
                header: { items_json: JSON.stringify(mockHeaderItems) },
                footer: { items_json: JSON.stringify(mockFooterItems) },
              },
              mockSitePages
            )}
          >
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
      <MemoryRouter initialEntries={['/navigation']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider
            client={createQueryClient(
              {
                header: { items_json: JSON.stringify([]) },
                footer: { items_json: JSON.stringify([]) },
              },
              mockSitePages
            )}
          >
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
