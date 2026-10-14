import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { PostsTemplateEditor } from './PostsTemplateEditor';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WebMCPProvider } from '../../providers/WebMCPProvider';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const meta = {
  title: 'Pages/PostsTemplateEditor',
  component: PostsTemplateEditor,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PostsTemplateEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultView: Story = {
  decorators: [
    (Story) => {
      const router = createMemoryRouter(
        [
          {
            path: '/templates/posts',
            element: (
              <WebMCPProvider>
                <Theme appearance="light" accentColor="cyan" radius="medium">
                  <QueryClientProvider client={createQueryClient()}>
                    <Story />
                  </QueryClientProvider>
                </Theme>
              </WebMCPProvider>
            ),
          },
        ],
        { initialEntries: ['/templates/posts'] }
      );
      return <RouterProvider router={router} />;
    },
  ],
};

export const CssTabActive: Story = {
  args: {
    initialTab: 'css',
  },
  decorators: [
    (Story) => {
      const router = createMemoryRouter(
        [
          {
            path: '/templates/posts',
            element: (
              <WebMCPProvider>
                <Theme appearance="dark" accentColor="cyan" radius="medium">
                  <QueryClientProvider client={createQueryClient()}>
                    <Story />
                  </QueryClientProvider>
                </Theme>
              </WebMCPProvider>
            ),
          },
        ],
        { initialEntries: ['/templates/posts'] }
      );
      return <RouterProvider router={router} />;
    },
  ],
};
