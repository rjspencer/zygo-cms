import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Analytics } from './Analytics';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnalyticsApiResponse } from './types';

const createQueryClient = (data?: AnalyticsApiResponse, shouldFail?: boolean) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  if (shouldFail) {
    client.setQueryData(['analytics'], () => {
      throw new Error('Failed to fetch analytics');
    });
  } else if (data) {
    client.setQueryData(['analytics'], data);
  }

  return client;
};

const sampleAnalyticsData: AnalyticsApiResponse = {
  data: {
    viewer: {
      zones: [
        {
          rumPageloadEventsAdaptiveGroups: [
            { count: 151200, dimensions: { requestPath: '/', clientCountryName: 'US' } },
            { count: 48900, dimensions: { requestPath: '/blog', clientCountryName: 'GB' } },
            { count: 21300, dimensions: { requestPath: '/pricing', clientCountryName: 'DE' } },
          ],
        },
      ],
    },
  },
};

const meta = {
  title: 'Pages/Analytics',
  component: Analytics,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Analytics>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <QueryClientProvider client={createQueryClient(sampleAnalyticsData)}>
          <Story />
        </QueryClientProvider>
      </Theme>
    ),
  ],
};

export const Disabled: Story = {
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <QueryClientProvider client={createQueryClient({ disabled: true })}>
          <Story />
        </QueryClientProvider>
      </Theme>
    ),
  ],
};

export const Loading: Story = {
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <QueryClientProvider client={new QueryClient()}>
          <Story />
        </QueryClientProvider>
      </Theme>
    ),
  ],
};
