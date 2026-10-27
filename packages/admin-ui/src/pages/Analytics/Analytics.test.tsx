import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Analytics } from './Analytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';

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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Analytics />
        </Theme>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Analytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAnalytics();
    expect(screen.getByText('Loading metrics...').textContent).toBe('Loading metrics...');
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

    const totalViews = await screen.findByText('Total Page Views');
    expect(totalViews.textContent).toBe('Total Page Views');

    expect(screen.getByText('151.7k').textContent).toBe('151.7k');
    expect(screen.getAllByText('/')[0].textContent).toBe('/');
    expect(screen.getAllByText('US')[0].textContent).toBe('US');
    expect(screen.getByText('Real-time Edge').textContent).toBe('Real-time Edge');
  });

  it('renders error state when API fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderAnalytics();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Failed to load analytics data.');
    errorSpy.mockRestore();
  });

  it('renders error state with details when API returns 502 with error message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        error: 'Cloudflare GraphQL query timed out',
      }),
    });

    renderAnalytics();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Failed to load analytics data.');
    expect(alert.textContent).toContain('Cloudflare GraphQL query timed out');
    errorSpy.mockRestore();
  });

  it('renders error state when GraphQL response contains errors array', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [{ message: 'Field "unknownField" does not exist' }],
      }),
    });

    renderAnalytics();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Failed to load analytics data.');
    expect(alert.textContent).toContain('Field "unknownField" does not exist');
  });

  it('renders setup message with Cloudflare dashboard link when analytics returns 403', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    renderAnalytics();

    const heading = await screen.findByRole('heading', {
      name: /cloudflare web analytics not enabled/i,
    });
    expect(heading.textContent).toBe('Cloudflare Web Analytics Not Enabled');

    const link = screen.getByRole('link', { name: /cloudflare dashboard/i });
    expect(link.getAttribute('href')).toBe('https://dash.cloudflare.com/');
    expect(screen.getByText('Disabled').textContent).toBe('Disabled');
  });

  it('renders configuration guide when missing credentials', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        missing_credentials: true,
      }),
    });

    renderAnalytics();

    const heading = await screen.findByRole('heading', {
      name: /cloudflare analytics not configured/i,
    });
    expect(heading.textContent).toBe('Cloudflare Analytics Not Configured');

    expect(screen.getByText(/CF_API_TOKEN/).textContent).toContain('CF_API_TOKEN');
    const settingsLink = screen.getByRole('link', { name: /configure in site settings/i });
    expect(settingsLink.getAttribute('href')).toBe('/settings');
  });

  it('renders dual analytics data with RUM metrics and Edge metrics tab switching', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        rum_configured: true,
        edge_configured: true,
        rum: {
          groups: [
            {
              count: 12000,
              dimensions: { requestPath: '/blog/first-post', countryName: 'United States' },
            },
          ],
        },
        edge: {
          groups: [
            {
              count: 50000,
              sum: { edgeResponseBytes: 10485760 },
              dimensions: { clientRequestPath: '/api/v1', clientCountryName: 'Germany' },
            },
          ],
        },
      }),
    });

    renderAnalytics();

    const totalViews = await screen.findByText('Total Page Views');
    expect(totalViews.textContent).toBe('Total Page Views');

    expect(screen.getAllByText('12.0k')[0].textContent).toBe('12.0k');
    expect(screen.getAllByText('/blog/first-post')[0].textContent).toBe('/blog/first-post');
    expect(screen.getAllByText('United States')[0].textContent).toBe('United States');

    // Switch to Edge Infrastructure tab
    const edgeTab = screen.getByRole('tab', { name: /edge infrastructure/i });
    await user.click(edgeTab);

    const edgeRequests = await screen.findByText('Total Edge Requests');
    expect(edgeRequests.textContent).toBe('Total Edge Requests');
    expect(screen.getAllByText('50.0k')[0].textContent).toBe('50.0k');
    expect(screen.getAllByText('10.0 MB')[0].textContent).toBe('10.0 MB');
    expect(screen.getAllByText('/api/v1')[0].textContent).toBe('/api/v1');
    expect(screen.getAllByText('Germany')[0].textContent).toBe('Germany');
  });

  it('renders RUM unconfigured prompt banner and displays edge metrics when rum_configured is false', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        rum_configured: false,
        edge_configured: true,
        rum: { groups: [] },
        edge: {
          groups: [
            {
              count: 25000,
              sum: { edgeResponseBytes: 5242880 },
              dimensions: { clientRequestPath: '/home', clientCountryName: 'Canada' },
            },
          ],
        },
      }),
    });

    renderAnalytics();

    const banner = await screen.findByText(/Cloudflare Web Analytics Site Tag is not configured/i);
    expect(banner.textContent).toContain('Cloudflare Web Analytics Site Tag is not configured');

    // In default rendered view, Edge metrics are shown
    expect(screen.getByText('Total Edge Requests').textContent).toBe('Total Edge Requests');
    expect(screen.getAllByText('25.0k')[0].textContent).toBe('25.0k');
    expect(screen.getAllByText('5.0 MB')[0].textContent).toBe('5.0 MB');
    expect(screen.getAllByText('/home')[0].textContent).toBe('/home');
    expect(screen.getAllByText('Canada')[0].textContent).toBe('Canada');
  });
});
