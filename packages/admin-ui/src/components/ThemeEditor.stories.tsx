import type { Meta, StoryObj } from '@storybook/react';
import { ThemeEditor, MODERN_EDITORIAL_PRESET } from './ThemeEditor';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WebMCPProvider } from '../providers/WebMCPProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta = {
  title: 'Pages/ThemeEditor',
  component: ThemeEditor,
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
} satisfies Meta<typeof ThemeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultModernEditorial: Story = {
  args: {
    initialTokens: MODERN_EDITORIAL_PRESET,
  },
};

export const CenteredMastheadDoubleBorder: Story = {
  args: {
    initialTokens: {
      ...MODERN_EDITORIAL_PRESET,
      headerLayout: 'centered',
      headerBorderStyle: 'double',
      headerTitleSize: '2.25rem',
      headerNavTransform: 'uppercase',
      headerTagline: 'A Journal of Critical Inquiry',
    },
  },
};

export const SplitBarSolidBorder: Story = {
  args: {
    initialTokens: {
      ...MODERN_EDITORIAL_PRESET,
      headerLayout: 'split',
      headerBorderStyle: 'solid',
      headerTitleSize: '1.5rem',
      headerNavTransform: 'none',
      headerTagline: 'Weekly Dispatches',
    },
  },
};

export const WithWebMCPLiveUpdate: Story = {
  args: {
    initialTokens: {
      ...MODERN_EDITORIAL_PRESET,
      colorAccent: '#0284c7',
      headerTagline: 'WebMCP Live Editor Preview',
    },
  },
};

