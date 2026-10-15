import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Analytics } from './Analytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderAnalytics = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <Analytics />
      </Theme>
    </QueryClientProvider>
  );
};

describe('Analytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAnalytics();
    expect(screen.getByText('Loading metrics...')).toBeDefined();
  });

  it('renders analytics data successfully', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          viewer: {
            zones: [
              {
                rumPageloadEventsAdaptiveGroups: [
                  { count: 151200, dimensions: { requestPath: '/', clientCountryName: 'US' } },
                  { count: 500, dimensions: { requestPath: '/blog', clientCountryName: 'CA' } },
                ],
              },
            ],
          },
        },
      }),
    });

    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Total Page Views')).toBeDefined();
    });

    expect(screen.getByText('151.7k')).toBeDefined();
    expect(screen.getByText('/')).toBeDefined();
    expect(screen.getByText('US')).toBeDefined();
    expect(screen.getByText('Real-time Edge')).toBeDefined();
  });

  it('renders error state when API fails', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data.')).toBeDefined();
    });
  });

  it('renders setup message with Cloudflare dashboard link when analytics returns 403', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Cloudflare Web Analytics Not Enabled')).toBeDefined();
    });
    expect(screen.getByText('Cloudflare Dashboard')).toBeDefined();
    expect(screen.getByText('Disabled')).toBeDefined();
  });
});
