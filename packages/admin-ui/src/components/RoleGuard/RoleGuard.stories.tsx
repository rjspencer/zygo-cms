import type { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleGuard } from './RoleGuard';

const createQueryClient = (role: string) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  client.setQueryData(['me'], { role });
  return client;
};

const meta = {
  title: 'Components/RoleGuard',
  component: RoleGuard,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof RoleGuard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdminAllowed: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient('admin')}>
        <Theme>
          <Story />
        </Theme>
      </QueryClientProvider>
    ),
  ],
  args: {
    allowedRoles: ['admin'],
    children: <div>Protected Admin Content</div>,
  },
};

export const AccessDenied: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={createQueryClient('author')}>
        <Theme>
          <Story />
        </Theme>
      </QueryClientProvider>
    ),
  ],
  args: {
    allowedRoles: ['admin'],
    children: <div>Protected Admin Content</div>,
  },
};
