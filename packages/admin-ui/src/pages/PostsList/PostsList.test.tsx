import '../../test/setup';
import { render, screen, waitFor } from '@testing-library/react';
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

const workflowPostsData = [
  ...mockPostsData,
  {
    id: 105,
    type: 'post',
    title: 'In Review Post',
    slug: 'in-review-post',
    status: 'in_review',
    created_at: '2026-03-05 10:00:00',
  },
  {
    id: 106,
    type: 'post',
    title: 'Ready for Publish Post',
    slug: 'ready-for-publish-post',
    status: 'ready_for_publish',
    created_at: '2026-03-06 10:00:00',
  },
  {
    id: 107,
    type: 'post',
    title: 'Archived Post',
    slug: 'archived-post',
    status: 'archived',
    created_at: '2026-03-07 10:00:00',
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

    expect(screen.getByRole('heading', { name: 'Posts' }).textContent).toBe('Posts');
    expect(screen.getByText('Manage your blog posts and articles').textContent).toBe(
      'Manage your blog posts and articles'
    );
    expect(
      screen.getByRole('textbox', { name: /search posts by title or slug/i }).getAttribute('value')
    ).toBe('');

    await screen.findByText('First Blog Post');
    expect(screen.getByText('/post/first-blog-post').textContent).toBe('/post/first-blog-post');
    expect(screen.getByText('Upcoming Features').textContent).toBe('Upcoming Features');
    expect(screen.getByText('/post/upcoming-features').textContent).toBe('/post/upcoming-features');
    expect(screen.getByText('Scheduled Release').textContent).toBe('Scheduled Release');
    expect(screen.getByText('/post/scheduled-release').textContent).toBe('/post/scheduled-release');
    expect(screen.queryByText('Should Be Filtered Out')).toBeNull();
  });

  it('filters posts based on search input', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    renderPostsList();

    await screen.findByText('First Blog Post');

    const searchInput = screen.getByRole('textbox', { name: /search posts by title or slug/i });
    await user.click(searchInput);
    await user.paste('upcoming');
    expect((searchInput as HTMLInputElement).value).toBe('upcoming');

    await waitFor(() => {
      expect(screen.queryByText('First Blog Post')).toBeNull();
    });
    expect(screen.getByText('Upcoming Features').textContent).toBe('Upcoming Features');
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    renderPostsList(['/posts?q=scheduled']);

    await screen.findByText('Scheduled Release');
    expect(
      screen.getByRole('textbox', { name: /search posts by title or slug/i }).getAttribute('value')
    ).toBe('scheduled');
    expect(screen.queryByText('First Blog Post')).toBeNull();
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

    const editTemplateBtn = screen.getByRole('button', { name: /edit template & styles/i });
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

    await screen.findByText('First Blog Post');

    const editButtons = screen.getAllByRole('button', { name: 'Edit Post' });
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

    await screen.findByText('First Blog Post');

    const viewButtons = screen.getAllByRole('button', { name: 'View Public Post' });
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

    await screen.findByText('First Blog Post');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Post' });
    await user.click(deleteButtons[0]);

    // Check dialog appears
    expect(screen.getByRole('heading', { name: 'Delete Post' }).textContent).toBe('Delete Post');
    expect(
      screen.getByText(/Are you sure you want to delete “First Blog Post”?/i).textContent
    ).toContain('Are you sure you want to delete “First Blog Post”?');

    // Mock delete API response and subsequent query refetch
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData.filter((p) => p.id !== 101),
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/101', { method: 'DELETE' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByText('First Blog Post')).toBeNull();
    });
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await screen.findByText('First Blog Post');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Post' });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('heading', { name: 'Delete Post' }).textContent).toBe('Delete Post');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('selects multiple posts and executes bulk publish operation', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await screen.findByText('First Blog Post');

    // Bulk bar not visible initially
    expect(screen.queryByRole('region', { name: 'Bulk actions toolbar' })).toBeNull();

    // Select first post
    const postCheckbox = screen.getByRole('checkbox', { name: 'Select post First Blog Post' });
    await user.click(postCheckbox);

    // Bulk action bar appears
    expect(screen.getByRole('region', { name: 'Bulk actions toolbar' })).toBeTruthy();
    expect(screen.getByText('1 item selected').textContent).toBe('1 item selected');

    // Select all posts using header checkbox
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all posts/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('3 items selected').textContent).toBe('3 items selected');

    // Mock bulk API response and subsequent query refetch
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, affected: 3, skipped: 0, errors: [] }),
    });
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData.map((p) => ({ ...p, status: 'published' })),
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

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Bulk actions toolbar' })).toBeNull();
    });
  });

  it('executes bulk trash operation through confirmation dialog', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPostsData,
    });

    const user = userEvent.setup();
    renderPostsList();

    await screen.findByText('First Blog Post');

    // Select second post
    const postCheckbox = screen.getByRole('checkbox', { name: 'Select post Upcoming Features' });
    await user.click(postCheckbox);

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
      json: async () => mockPostsData.filter((p) => p.id !== 102),
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

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByText('Upcoming Features')).toBeNull();
    });
  });

  it('filters posts based on status tab click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPostsData,
    });

    renderPostsList();

    await screen.findByText('First Blog Post');
    expect(screen.getByText('In Review Post').textContent).toBe('In Review Post');

    // Click "In Review" tab
    const inReviewTab = screen.getByRole('tab', { name: /in review/i });
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.queryByText('First Blog Post')).toBeNull();
      expect(screen.queryByText('Upcoming Features')).toBeNull();
    });
    expect(screen.getByText('In Review Post').textContent).toBe('In Review Post');
  });

  it('filters posts based on URL status param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPostsData,
    });

    renderPostsList(['/posts?status=ready_for_publish']);

    await screen.findByText('Ready for Publish Post');
    expect(screen.queryByText('First Blog Post')).toBeNull();
    expect(screen.queryByText('In Review Post')).toBeNull();
  });

  it('renders correct badge colors for workflow statuses', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowPostsData,
    });

    renderPostsList();

    await screen.findByText('in review');
    const inReviewBadge = screen.getByText('in review');
    expect(inReviewBadge.getAttribute('data-accent-color')).toBe('amber');

    const readyBadge = screen.getByText('ready for publish');
    expect(readyBadge.getAttribute('data-accent-color')).toBe('blue');

    const archivedBadge = screen.getByText('archived');
    expect(archivedBadge.getAttribute('data-accent-color')).toBe('red');
  });
});
