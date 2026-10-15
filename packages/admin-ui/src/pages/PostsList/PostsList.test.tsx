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
});
