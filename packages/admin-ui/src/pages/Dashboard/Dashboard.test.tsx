import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => `https://example.com${path || ''}`),
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

const mockEntries = [
  {
    id: 1,
    title: 'Hello World Post',
    slug: 'hello-world',
    type: 'post',
    status: 'published',
    created_at: '2026-03-01',
  },
  {
    id: 2,
    title: 'About Page',
    slug: 'about',
    type: 'page',
    status: 'draft',
    created_at: '2026-03-02',
  },
];

const mockMetrics = {
  post_count: 10,
  page_count: 5,
  doc_count: 2,
  media_count: 3,
};

const renderDashboard = () => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/', element: <Dashboard /> },
      { path: '/posts', element: <div>Posts List View</div> },
      { path: '/posts/editor/new', element: <div>New Post View</div> },
      { path: '/posts/editor/:id', element: <div>Edit Post View</div> },
      { path: '/pages/editor/:id', element: <div>Edit Page View</div> },
      { path: '/docs/editor/:id', element: <div>Edit Doc View</div> },
    ],
    { initialEntries: ['/'] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('Dashboard Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
    } as Response);
  });

  it('renders header, metrics cards, and recent entries', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/entries') {
        return Promise.resolve({ ok: true, json: async () => mockEntries });
      }
      if (url === '/api/admin/dashboard') {
        return Promise.resolve({ ok: true, json: async () => mockMetrics });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined();
    expect(screen.getByText('Total Posts')).toBeDefined();
    expect(screen.getByText('Total Pages')).toBeDefined();
    expect(screen.getByText('Total Docs')).toBeDefined();
    expect(screen.getByText('Media Files')).toBeDefined();
    expect(screen.getByText('Edge Status')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Hello World Post')).toBeDefined();
      expect(screen.getByText('About Page')).toBeDefined();
    });

    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('handles API errors gracefully without crashing', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Network error'));

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined();
    expect(screen.getByText('Total Posts')).toBeDefined();
  });

  it('renders action buttons for New Post and View All', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/entries') return Promise.resolve({ ok: true, json: async () => [] });
      if (url === '/api/admin/dashboard') return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('Not found'));
    });

    renderDashboard();

    const newPostBtn = screen.getByRole('button', { name: /New Post/i });
    expect(newPostBtn).toBeDefined();
    fireEvent.click(newPostBtn);

    await waitFor(() => {
      expect(screen.getByText('New Post View')).toBeDefined();
    });
  });

  it('displays Degraded edge status when public site health check returns non-200', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/entries') return Promise.resolve({ ok: true, json: async () => [] });
      if (url === '/api/admin/dashboard') return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('Not found'));
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 500,
      ok: false,
    } as Response);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Degraded')).toBeDefined();
    });
  });
});
