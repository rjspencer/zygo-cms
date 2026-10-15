import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { ThemePage } from './Theme';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WebMCPProvider } from '../../providers/WebMCPProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta = {
  title: 'Pages/Theme',
  component: ThemePage,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => {
      const router = createMemoryRouter([
        {
          path: '/',
          element: (
            <WebMCPProvider>
              <Theme appearance="light" accentColor="cyan" radius="medium">
                <QueryClientProvider client={queryClient}>
                  <Story />
                </QueryClientProvider>
              </Theme>
            </WebMCPProvider>
          ),
        },
      ]);
      return <RouterProvider router={router} />;
    },
  ],
} satisfies Meta<typeof ThemePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
