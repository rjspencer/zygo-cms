import type { Meta, StoryObj } from '@storybook/react';
import { ThemeEditor, MODERN_EDITORIAL_PRESET } from './ThemeEditor';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

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
    (Story) => (
      <BrowserRouter>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={queryClient}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </BrowserRouter>
    ),
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
