import '../../test/setup';
import { render, screen, waitFor } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Pages' }).textContent).toBe('Pages');
    expect(screen.getByText('Manage static and landing pages for your site').textContent).toBe(
      'Manage static and landing pages for your site'
    );
    expect(
      screen.getByRole('textbox', { name: /search pages by title or slug/i }).getAttribute('value')
    ).toBe('');

    await screen.findByText('About Us');
    expect(screen.getByText('/about').textContent).toBe('/about');
    expect(screen.getByText('Contact').textContent).toBe('Contact');
    expect(screen.getByText('/contact').textContent).toBe('/contact');
    // Should filter out non-page types
    expect(screen.queryByText('Ignore Me Post')).toBeNull();
  });

  it('filters pages based on search input', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    renderPagesList();

    await screen.findByText('About Us');

    const searchInput = screen.getByRole('textbox', { name: /search pages by title or slug/i });
    await user.click(searchInput);
    await user.paste('contact');
    expect((searchInput as HTMLInputElement).value).toBe('contact');

    await waitFor(() => {
      expect(screen.queryByText('About Us')).toBeNull();
    });
    expect(screen.getByText('Contact').textContent).toBe('Contact');
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    renderPagesList(['/pages?q=About']);

    await screen.findByText('About Us');
    expect(
      screen.getByRole('textbox', { name: /search pages by title or slug/i }).getAttribute('value')
    ).toBe('About');
    expect(screen.queryByText('Contact')).toBeNull();
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

    await screen.findByText('About Us');

    const editButtons = screen.getAllByRole('button', { name: 'Edit Page' });
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

    await screen.findByText('About Us');

    const viewButtons = screen.getAllByRole('button', { name: 'View Public Page' });
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

    await screen.findByText('About Us');

    const deleteButton = screen.getByRole('button', { name: 'Delete About Us' });
    await user.click(deleteButton);

    // Check dialog appears
    expect(screen.getByRole('heading', { name: 'Delete Page' }).textContent).toBe('Delete Page');
    expect(
      screen.getByText(/Are you sure you want to delete “About Us”?/i).textContent
    ).toContain('Are you sure you want to delete “About Us”?');

    // Mock delete API response and subsequent query refetch
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData.filter((p) => p.id !== 1),
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/1', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByText('About Us')).toBeNull();
    });
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await screen.findByText('About Us');

    const deleteButton = screen.getByRole('button', { name: 'Delete About Us' });
    await user.click(deleteButton);

    expect(screen.getByRole('heading', { name: 'Delete Page' }).textContent).toBe('Delete Page');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
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

    await screen.findByText('Home');

    const homeDeleteBtn = screen.getByRole('button', { name: 'Delete Home' });
    expect(homeDeleteBtn.getAttribute('title')).toBe('The Home page cannot be deleted');
    expect(homeDeleteBtn.hasAttribute('disabled')).toBe(true);
  });

  it('selects multiple pages and executes bulk publish operation', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await screen.findByText('About Us');

    // Bulk bar not visible initially
    expect(screen.queryByRole('region', { name: 'Bulk actions toolbar' })).toBeNull();

    // Select first page
    const pageCheckbox = screen.getByRole('checkbox', { name: 'Select page About Us' });
    await user.click(pageCheckbox);

    // Bulk action bar appears
    expect(screen.getByRole('region', { name: 'Bulk actions toolbar' })).toBeTruthy();
    expect(screen.getByText('1 item selected').textContent).toBe('1 item selected');

    // Select all pages using header checkbox
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all pages/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('2 items selected').textContent).toBe('2 items selected');

    // Mock bulk API response and subsequent query refetch
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 2, skipped: 0, errors: [] }),
    });
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData.map((p) => ({ ...p, status: 'published' })),
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

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Bulk actions toolbar' })).toBeNull();
    });
  });

  it('executes bulk trash operation on selected pages', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData,
    });

    const user = userEvent.setup();
    renderPagesList();

    await screen.findByText('About Us');

    // Select second page
    const pageCheckbox = screen.getByRole('checkbox', { name: 'Select page Contact' });
    await user.click(pageCheckbox);

    // Click Move to Trash in Bulk bar
    const trashBtn = screen.getByRole('button', { name: /bulk move selected entries to trash/i });
    await user.click(trashBtn);

    // Confirm dialog appears
    expect(screen.getByRole('heading', { name: 'Move Entries to Trash' }).textContent).toBe(
      'Move Entries to Trash'
    );
    expect(
      screen.getByText(/Are you sure you want to move 1 entry to the trash/i).textContent
    ).toContain('Are you sure you want to move 1 entry to the trash?');

    // Mock bulk trash response and subsequent query refetch
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 1, skipped: 0, errors: [] }),
    });
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPagesData.filter((p) => p.id !== 2),
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

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByText('Contact')).toBeNull();
    });
  });

  it('filters pages based on status tab click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList();

    await screen.findByText('About Us');
    expect(screen.getByText('In Review Page').textContent).toBe('In Review Page');

    const inReviewTab = screen.getByRole('tab', { name: /in review/i });
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.queryByText('About Us')).toBeNull();
      expect(screen.queryByText('Contact')).toBeNull();
    });
    expect(screen.getByText('In Review Page').textContent).toBe('In Review Page');
  });

  it('filters pages based on URL status param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList(['/pages?status=ready_for_publish']);

    await screen.findByText('Ready Page');
    expect(screen.queryByText('About Us')).toBeNull();
    expect(screen.queryByText('In Review Page')).toBeNull();
  });

  it('renders correct badge colors for workflow statuses', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPagesData,
    });

    renderPagesList();

    await screen.findByText('in review');
    const inReviewBadge = screen.getByText('in review');
    expect(inReviewBadge.getAttribute('data-accent-color')).toBe('amber');

    const readyBadge = screen.getByText('ready for publish');
    expect(readyBadge.getAttribute('data-accent-color')).toBe('blue');

    const archivedBadge = screen.getByText('archived');
    expect(archivedBadge.getAttribute('data-accent-color')).toBe('red');
  });
});
