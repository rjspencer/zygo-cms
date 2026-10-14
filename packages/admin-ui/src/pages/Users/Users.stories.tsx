import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Users } from './Users';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { UserItem } from './types';

const mockUsers: UserItem[] = [
  {
    id: 1,
    auth_provider_id: 'cf-access-1',
    email: 'admin@zygodactyl.io',
    display_name: 'Alice Admin',
    role: 'admin',
    bio: 'Platform administrator and lead engineer.',
    website: 'https://zygodactyl.io',
    avatar_url: 'https://example.com/alice.png',
    created_at: '2026-08-01 10:00:00',
    updated_at: '2026-08-01 10:00:00',
    deleted_at: null,
  },
  {
    id: 2,
    auth_provider_id: 'cf-access-2',
    email: 'bob@zygodactyl.io',
    display_name: 'Bob Author',
    role: 'author',
    bio: 'Tech writer and documentation author.',
    website: 'bobwriter.com',
    avatar_url: null,
    created_at: '2026-08-15 14:30:00',
    updated_at: '2026-08-15 14:30:00',
    deleted_at: null,
  },
  {
    id: 3,
    auth_provider_id: 'cf-access-3',
    email: 'editor@zygodactyl.io',
    display_name: 'Carol Editor',
    role: 'editor',
    bio: 'Content strategist and copy editor.',
    website: null,
    avatar_url: null,
    created_at: '2026-09-01 09:15:00',
    updated_at: '2026-09-01 09:15:00',
    deleted_at: null,
  },
];

const createQueryClient = (initialUsers?: UserItem[]) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (initialUsers) {
    client.setQueryData(['adminUsers'], initialUsers);
  }
  return client;
};

const meta = {
  title: 'Pages/Users',
  component: Users,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Users>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(mockUsers)}>
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
      <MemoryRouter>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient([])}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme appearance="dark" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(mockUsers)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
