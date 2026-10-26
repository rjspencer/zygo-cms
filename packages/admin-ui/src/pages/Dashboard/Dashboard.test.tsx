import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
import { QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createTestQueryClient } from '../../test/test-utils';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => `https://example.com${path || ''}`),
}));

import { apiFetch } from '../../utils/api';

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

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <RouterProvider router={router} />
        </Theme>
      </QueryClientProvider>
    ),
  };
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

    expect(screen.getByRole('heading', { name: 'Dashboard' }).textContent).toBe('Dashboard');
    expect(screen.getByText('Total Posts').textContent).toBe('Total Posts');
    expect(screen.getByText('Total Pages').textContent).toBe('Total Pages');
    expect(screen.getByText('Total Docs').textContent).toBe('Total Docs');
    expect(screen.getByText('Media Files').textContent).toBe('Media Files');
    expect(screen.getByText('Edge Status').textContent).toBe('Edge Status');

    const helloWorldEntry = await screen.findByText('Hello World Post');
    expect(helloWorldEntry.textContent).toBe('Hello World Post');
    expect(screen.getByText('About Page').textContent).toBe('About Page');

    const postCount = await screen.findByText('10');
    expect(postCount.textContent).toBe('10');
    expect(screen.getByText('5').textContent).toBe('5');
    expect(screen.getByText('2').textContent).toBe('2');
    expect(screen.getByText('3').textContent).toBe('3');

    const edgeStatus = await screen.findByText('Operational');
    expect(edgeStatus.textContent).toBe('Operational');
  });

  it('handles API errors gracefully without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockRejectedValue(new Error('Network error'));

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dashboard' }).textContent).toBe('Dashboard');
    expect(screen.getByText('Total Posts').textContent).toBe('Total Posts');
    expect(await screen.findByText('No recent entries found.')).not.toBeNull();

    consoleSpy.mockRestore();
  });

  it('renders action buttons for New Post and View All', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/entries') return Promise.resolve({ ok: true, json: async () => [] });
      if (url === '/api/admin/dashboard') return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.reject(new Error('Not found'));
    });

    renderDashboard();

    const viewAllBtn = screen.getByRole('button', { name: /View All/i });
    expect(viewAllBtn.hasAttribute('disabled')).toBe(false);

    const newPostBtn = screen.getByRole('button', { name: /New Post/i });
    expect(newPostBtn.hasAttribute('disabled')).toBe(false);

    await user.click(newPostBtn);

    const newPostView = await screen.findByText('New Post View');
    expect(newPostView.textContent).toBe('New Post View');
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

    const degradedBadge = await screen.findByText('Degraded');
    expect(degradedBadge.textContent).toBe('Degraded');
  });
});
