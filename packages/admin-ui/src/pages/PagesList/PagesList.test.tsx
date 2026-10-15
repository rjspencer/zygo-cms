import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PagesList } from './PagesList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path: string) => `https://example.com${path}`),
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

const mockPagesData = [
  {
    id: 1,
    type: 'page',
    title: 'About Us',
    path: '/about',
    status: 'published',
    published_at: '2026-03-01 12:00:00',
  },
  {
    id: 2,
    type: 'page',
    title: 'Contact',
    slug: 'contact',
    status: 'draft',
    created_at: '2026-03-02 14:00:00',
  },
  {
    id: 3,
    type: 'post',
    title: 'Ignore Me Post',
    slug: 'ignore-me',
    status: 'published',
  },
];

const renderPagesList = (initialEntries = ['/pages']) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/pages', element: <PagesList /> },
      { path: '/pages/editor/:id', element: <div data-testid="editor-view">Editor View</div> },
    ],
    { initialEntries }
  );

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <RouterProvider router={router} />
        </Theme>
      </QueryClientProvider>
    ),
    router,
  };
};

describe('PagesList component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, search bar, and fetched pages table', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    renderPagesList();

    expect(screen.getByRole('heading', { name: 'Pages' })).toBeDefined();
    expect(screen.getByText('Manage static and landing pages for your site')).toBeDefined();
    expect(screen.getByPlaceholderText('Search pages by title or slug...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
      expect(screen.getByText('/about')).toBeDefined();
      expect(screen.getByText('Contact')).toBeDefined();
      expect(screen.getByText('/contact')).toBeDefined();
      // Should filter out non-page types
      expect(screen.queryByText('Ignore Me Post')).toBeNull();
    });
  });

  it('filters pages based on search input', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search pages by title or slug...');
    fireEvent.change(searchInput, { target: { value: 'contact' } });

    await waitFor(() => {
      expect(screen.queryByText('About Us')).toBeNull();
      expect(screen.getByText('Contact')).toBeDefined();
    });
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    renderPagesList(['/pages?q=About']);

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
      expect(screen.queryByText('Contact')).toBeNull();
    });
  });

  it('navigates to create new page on button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    const { router } = renderPagesList();

    const createButton = screen.getByRole('button', { name: /create page/i });
    await user.click(createButton);

    expect(router.state.location.pathname).toBe('/pages/editor/new');
  });

  it('navigates to edit page on edit button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    const { router } = renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    const editButtons = screen.getAllByTitle('Edit Page');
    await user.click(editButtons[0]);

    expect(router.state.location.pathname).toBe('/pages/editor/1');
  });

  it('opens public page URL in a new window', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    const viewButtons = screen.getAllByTitle('View Public Page');
    await user.click(viewButtons[0]);

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/about', '_blank');
    windowOpenSpy.mockRestore();
  });
});
