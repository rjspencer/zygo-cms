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

  it('selects multiple pages and executes bulk publish operation', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    // Bulk bar not visible initially
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();

    // Select first page
    const pageCheckbox = screen.getByTestId('select-page-1');
    await user.click(pageCheckbox);

    // Bulk action bar appears
    expect(screen.getByTestId('bulk-action-bar')).toBeDefined();
    expect(screen.getByText('1 item selected')).toBeDefined();

    // Select all pages using header checkbox
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all pages/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('2 items selected')).toBeDefined();

    // Mock bulk API response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 2, skipped: 0, errors: [] }),
    });

    const publishBtn = screen.getByRole('button', { name: /bulk publish/i });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/entries/bulk',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: [1, 2], action: 'publish' }),
        })
      );
    });
  });

  it('executes bulk trash operation on selected pages', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    // Select second page
    const pageCheckbox = screen.getByTestId('select-page-2');
    await user.click(pageCheckbox);

    // Click Move to Trash in Bulk bar
    const trashBtn = screen.getByRole('button', { name: /bulk move selected entries to trash/i });
    await user.click(trashBtn);

    // Confirm dialog appears
    expect(screen.getByText(/Are you sure you want to move 1 entry to the trash/i)).toBeDefined();

    // Mock bulk trash response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 1, skipped: 0, errors: [] }),
    });

    const confirmTrashBtn = screen.getByRole('button', { name: /confirm move to trash/i });
    await user.click(confirmTrashBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/entries/bulk',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: [2], action: 'trash' }),
        })
      );
    });
  });
});
