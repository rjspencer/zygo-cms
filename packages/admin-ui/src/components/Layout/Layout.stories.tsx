import type { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../context/ThemeModeContext';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import { WebMCPRegistry } from '../../lib/webmcp/registry';
import { Layout } from './Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockRegistry = new WebMCPRegistry();

const meta = {
  title: 'Layout/Layout',
  component: Layout,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Theme>
            <MemoryRouter initialEntries={['/']}>
              <WebMCPProvider registry={mockRegistry}>
                <div style={{ height: '100vh', width: '100vw' }}>
                  <Story />
                </div>
              </WebMCPProvider>
            </MemoryRouter>
          </Theme>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
