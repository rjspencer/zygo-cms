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

const workflowPagesData = [
  ...mockPagesData,
  {
    id: 10,
    type: 'page',
    title: 'In Review Page',
    slug: 'in-review-page',
    status: 'in_review',
    created_at: '2026-03-05 10:00:00',
  },
  {
    id: 11,
    type: 'page',
    title: 'Ready Page',
    slug: 'ready-page',
    status: 'ready_for_publish',
    created_at: '2026-03-06 10:00:00',
  },
  {
    id: 12,
    type: 'page',
    title: 'Archived Page',
    slug: 'archived-page',
    status: 'archived',
    created_at: '2026-03-07 10:00:00',
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

  it('opens delete confirmation dialog and executes delete mutation for page', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Delete Page');
    await user.click(deleteButtons[0]);

    // Check dialog appears
    expect(screen.getByRole('heading', { name: 'Delete Page' })).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete “About Us”?/i)).toBeDefined();

    // Mock delete API response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/1', { method: 'DELETE' });
    });
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Delete Page');
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('heading', { name: 'Delete Page' })).toBeDefined();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Page' })).toBeNull();
    });
  });

  it('disables delete button for home page with appropriate tooltip', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 10,
          type: 'page',
          title: 'Home',
          path: '/',
          status: 'published',
        },
      ],
    });

    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeDefined();
    });

    const homeDeleteBtn = screen.getByTitle('The Home page cannot be deleted') as HTMLButtonElement;
    expect(homeDeleteBtn).toBeDefined();
    expect(homeDeleteBtn.disabled).toBe(true);
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

  it('filters pages based on status tab click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList();

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeDefined();
      expect(screen.getByText('In Review Page')).toBeDefined();
    });

    const inReviewTab = screen.getByTestId('status-tab-in_review');
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.getByText('In Review Page')).toBeDefined();
      expect(screen.queryByText('About Us')).toBeNull();
      expect(screen.queryByText('Contact')).toBeNull();
    });
  });

  it('filters pages based on URL status param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList(['/pages?status=ready_for_publish']);

    await waitFor(() => {
      expect(screen.getByText('Ready Page')).toBeDefined();
      expect(screen.queryByText('About Us')).toBeNull();
      expect(screen.queryByText('In Review Page')).toBeNull();
    });
  });

  it('renders correct badge colors for workflow statuses', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList();

    await waitFor(() => {
      const inReviewBadge = screen.getByText('in review');
      expect(inReviewBadge.getAttribute('data-accent-color')).toBe('amber');

      const readyBadge = screen.getByText('ready for publish');
      expect(readyBadge.getAttribute('data-accent-color')).toBe('blue');

      const archivedBadge = screen.getByText('archived');
      expect(archivedBadge.getAttribute('data-accent-color')).toBe('red');
    });
  });
});
