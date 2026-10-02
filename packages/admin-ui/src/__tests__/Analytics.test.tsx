import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { Analytics } from '../pages/Analytics';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Analytics Page', () => {
  it('renders loading state initially', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });

  it('renders analytics data successfully', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText('Total Page Views')).toBeInTheDocument();
    });

    // Check for the mocked data
    expect(screen.getByText('151.2k')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(
      http.get('*/api/analytics', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data.')).toBeInTheDocument();
    });
  });
});
