import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Analytics } from './Analytics';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { AnalyticsApiResponse } from './types';

const createQueryClient = (data?: AnalyticsApiResponse, shouldFail?: boolean, errorMsg?: string) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  if (shouldFail) {
    client.setQueryData(['analytics'], () => {
      throw new Error(errorMsg || 'Failed to fetch analytics');
    });
  } else if (data) {
    client.setQueryData(['analytics'], data);
  }

  return client;
};

const renderWithProviders = (data?: AnalyticsApiResponse, shouldFail?: boolean, errorMsg?: string) => {
  const client = createQueryClient(data, shouldFail, errorMsg);
  return (Story: React.ComponentType) => (
    <MemoryRouter>
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <QueryClientProvider client={client}>
          <Story />
        </QueryClientProvider>
      </Theme>
    </MemoryRouter>
  );
};

const sampleDualData: AnalyticsApiResponse = {
  rum_configured: true,
  edge_configured: true,
  rum: {
    groups: [
      { count: 151200, dimensions: { requestPath: '/', countryName: 'US' } },
      { count: 48900, dimensions: { requestPath: '/blog', countryName: 'GB' } },
      { count: 21300, dimensions: { requestPath: '/pricing', countryName: 'DE' } },
    ],
  },
  edge: {
    groups: [
      {
        count: 240000,
        sum: { edgeResponseBytes: 154857600 },
        dimensions: { clientRequestPath: '/', clientCountryName: 'US' },
      },
      {
        count: 85000,
        sum: { edgeResponseBytes: 52428800 },
        dimensions: { clientRequestPath: '/assets/app.js', clientCountryName: 'GB' },
      },
    ],
  },
};

const sampleEdgeOnlyData: AnalyticsApiResponse = {
  rum_configured: false,
  edge_configured: true,
  edge: {
    groups: [
      {
        count: 120000,
        sum: { edgeResponseBytes: 83886080 },
        dimensions: { clientRequestPath: '/', clientCountryName: 'US' },
      },
      {
        count: 45000,
        sum: { edgeResponseBytes: 31457280 },
        dimensions: { clientRequestPath: '/docs', clientCountryName: 'DE' },
      },
    ],
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
  decorators: [renderWithProviders(sampleDualData)],
};

export const EdgeOnlyWithoutRum: Story = {
  decorators: [renderWithProviders(sampleEdgeOnlyData)],
};

export const MissingCredentials: Story = {
  decorators: [renderWithProviders({ missing_credentials: true })],
};

export const Disabled: Story = {
  decorators: [renderWithProviders({ disabled: true })],
};

export const ErrorState: Story = {
  decorators: [renderWithProviders(undefined, true, 'Cloudflare GraphQL query timed out (502)')],
};

export const Loading: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={new QueryClient()}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
