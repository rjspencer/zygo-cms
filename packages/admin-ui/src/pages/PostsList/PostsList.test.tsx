import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostsList } from './PostsList';
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

const mockPostsData = [
  {
    id: 101,
    type: 'post',
    title: 'First Blog Post',
    slug: 'first-blog-post',
    status: 'published',
    published_at: '2026-03-01 10:00:00',
  },
  {
    id: 102,
    type: 'post',
    title: 'Upcoming Features',
    slug: 'upcoming-features',
    status: 'draft',
    created_at: '2026-03-02 12:00:00',
  },
  {
    id: 103,
    type: 'post',
    title: 'Scheduled Release',
    slug: 'scheduled-release',
    status: 'scheduled',
    published_at: '2026-04-01 09:00:00',
  },
  {
    id: 104,
    type: 'page',
    title: 'Should Be Filtered Out',
    slug: 'should-be-filtered-out',
    status: 'published',
  },
];

const renderPostsList = (initialEntries = ['/posts']) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/posts', element: <PostsList /> },
      { path: '/posts/editor/:id', element: <div data-testid="editor-view">Editor View</div> },
      { path: '/templates/posts', element: <div data-testid="template-view">Template View</div> },
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
    queryClient,
  };
};

describe('PostsList component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, search bar, and fetched posts table', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    renderPostsList();

    expect(screen.getByRole('heading', { name: 'Posts' })).toBeDefined();
    expect(screen.getByText('Manage your blog posts and articles')).toBeDefined();
    expect(screen.getByPlaceholderText('Search posts by title or slug...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
      expect(screen.getByText('/post/first-blog-post')).toBeDefined();
      expect(screen.getByText('Upcoming Features')).toBeDefined();
      expect(screen.getByText('/post/upcoming-features')).toBeDefined();
      expect(screen.getByText('Scheduled Release')).toBeDefined();
      expect(screen.getByText('/post/scheduled-release')).toBeDefined();
      expect(screen.queryByText('Should Be Filtered Out')).toBeNull();
    });
  });

  it('filters posts based on search input', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search posts by title or slug...');
    fireEvent.change(searchInput, { target: { value: 'upcoming' } });

    await waitFor(() => {
      expect(screen.queryByText('First Blog Post')).toBeNull();
      expect(screen.getByText('Upcoming Features')).toBeDefined();
    });
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    renderPostsList(['/posts?q=scheduled']);

    await waitFor(() => {
      expect(screen.getByText('Scheduled Release')).toBeDefined();
      expect(screen.queryByText('First Blog Post')).toBeNull();
    });
  });

  it('navigates to create new post on button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    const { router } = renderPostsList();

    const createBtn = screen.getByRole('button', { name: /create post/i });
    await user.click(createBtn);

    expect(router.state.location.pathname).toBe('/posts/editor/new');
  });

  it('navigates to edit templates on button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    const { router } = renderPostsList();

    const editTemplateBtn = screen.getByTestId('edit-posts-template-btn');
    await user.click(editTemplateBtn);

    expect(router.state.location.pathname).toBe('/templates/posts');
  });

  it('navigates to edit post on edit button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    const { router } = renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    const editButtons = screen.getAllByTitle('Edit Post');
    await user.click(editButtons[0]);

    expect(router.state.location.pathname).toBe('/posts/editor/101');
  });

  it('opens public post URL in a new window', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    const viewButtons = screen.getAllByTitle('View Public Post');
    await user.click(viewButtons[0]);

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/post/first-blog-post', '_blank');
    windowOpenSpy.mockRestore();
  });

  it('opens delete confirmation dialog and executes delete mutation', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Delete Post');
    await user.click(deleteButtons[0]);

    // Check dialog appears
    expect(screen.getByRole('heading', { name: 'Delete Post' })).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete “First Blog Post”?/i)).toBeDefined();

    // Mock delete API response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/101', { method: 'DELETE' });
    });
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Delete Post');
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('heading', { name: 'Delete Post' })).toBeDefined();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Post' })).toBeNull();
    });
  });

  it('selects multiple posts and executes bulk publish operation', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    // Bulk bar not visible initially
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();

    // Select first post
    const postCheckbox = screen.getByTestId('select-post-101');
    await user.click(postCheckbox);

    // Bulk action bar appears
    expect(screen.getByTestId('bulk-action-bar')).toBeDefined();
    expect(screen.getByText('1 item selected')).toBeDefined();

    // Select all posts using header checkbox
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all posts/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('3 items selected')).toBeDefined();

    // Mock bulk API response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 3, skipped: 0, errors: [] }),
    });

    const publishBtn = screen.getByRole('button', { name: /bulk publish/i });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/entries/bulk',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: [101, 102, 103], action: 'publish' }),
        })
      );
    });
  });

  it('executes bulk trash operation through confirmation dialog', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await waitFor(() => {
      expect(screen.getByText('First Blog Post')).toBeDefined();
    });

    // Select second post
    const postCheckbox = screen.getByTestId('select-post-102');
    await user.click(postCheckbox);

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
          body: JSON.stringify({ ids: [102], action: 'trash' }),
        })
      );
    });
  });
});
