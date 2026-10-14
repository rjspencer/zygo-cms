import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { TemplateEditor } from './TemplateEditor';
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
  title: 'Pages/TemplateEditor',
  component: TemplateEditor,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TemplateEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewTemplate: Story = {
  decorators: [
    (Story) => {
      const router = createMemoryRouter(
        [
          {
            path: '/templates/new',
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
        { initialEntries: ['/templates/new'] }
      );
      return <RouterProvider router={router} />;
    },
  ],
};

export const EditExistingTemplate: Story = {
  decorators: [
    (Story) => {
      const router = createMemoryRouter(
        [
          {
            path: '/templates/:id',
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
        { initialEntries: ['/templates/hero-banner'] }
      );
      return <RouterProvider router={router} />;
    },
  ],
};
