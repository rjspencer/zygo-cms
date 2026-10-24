import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocsList } from './DocsList';
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

const mockDocsResponse = {
  entries: [
    {
      id: 1,
      title: 'Guide Overview',
      slug: 'overview',
      path: '/docs/overview',
      status: 'published',
      published_at: '2026-03-01 10:00:00',
      parent_id: null,
      sort_order: 1,
    },
    {
      id: 2,
      title: 'Sub Chapter One',
      slug: 'sub-one',
      path: '/docs/overview/sub-one',
      status: 'published',
      published_at: '2026-03-02 12:00:00',
      parent_id: 1,
      sort_order: 1,
    },
    {
      id: 3,
      title: 'Standalone Doc',
      slug: 'standalone',
      path: '/docs/standalone',
      status: 'draft',
      created_at: '2026-03-03 14:00:00',
      parent_id: null,
      sort_order: 2,
    },
  ],
};

const workflowDocsResponse = {
  entries: [
    ...mockDocsResponse.entries,
    {
      id: 4,
      title: 'Review Chapter',
      slug: 'review-chapter',
      path: '/docs/review-chapter',
      status: 'in_review',
      created_at: '2026-03-04 10:00:00',
      parent_id: null,
      sort_order: 3,
    },
    {
      id: 5,
      title: 'Ready Chapter',
      slug: 'ready-chapter',
      path: '/docs/ready-chapter',
      status: 'ready_for_publish',
      created_at: '2026-03-05 10:00:00',
      parent_id: null,
      sort_order: 4,
    },
    {
      id: 6,
      title: 'Archived Chapter',
      slug: 'archived-chapter',
      path: '/docs/archived-chapter',
      status: 'archived',
      created_at: '2026-03-06 10:00:00',
      parent_id: null,
      sort_order: 5,
    },
  ],
};

const renderDocsList = (initialEntries = ['/docs']) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/docs', element: <DocsList /> },
      { path: '/docs/editor/new', element: <div>New Doc View</div> },
      { path: '/docs/editor/:id', element: <div>Edit Doc View</div> },
      { path: '/templates/docs', element: <div>Templates Docs View</div> },
    ],
    { initialEntries }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('DocsList Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, action buttons, search bar, and docs hierarchy', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    expect(screen.getByRole('heading', { name: 'Docs' })).toBeDefined();
    expect(screen.getByTestId('edit-docs-template-btn')).toBeDefined();
    expect(screen.getByRole('button', { name: /Create Doc/i })).toBeDefined();
    expect(screen.getByPlaceholderText('Search docs by title or slug...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Guide Overview')).toBeDefined();
      expect(screen.getByText('Sub Chapter One')).toBeDefined();
      expect(screen.getByText('Standalone Doc')).toBeDefined();
    });
  });

  it('filters docs based on search input', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await waitFor(() => {
      expect(screen.getByText('Guide Overview')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search docs by title or slug...');
    fireEvent.change(searchInput, { target: { value: 'standalone' } });

    await waitFor(() => {
      expect(screen.getByText('Standalone Doc')).toBeDefined();
    });
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList(['/docs?q=standalone']);

    const searchInput = screen.getByPlaceholderText('Search docs by title or slug...') as HTMLInputElement;
    expect(searchInput.value).toBe('standalone');

    await waitFor(() => {
      expect(screen.getByText('Standalone Doc')).toBeDefined();
    });
  });

  it('navigates to create doc view on button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    renderDocsList();

    const createBtn = screen.getByRole('button', { name: /Create Doc/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('New Doc View')).toBeDefined();
    });
  });

  it('navigates to template editor view on edit template button click', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    renderDocsList();

    const editTemplateBtn = screen.getByTestId('edit-docs-template-btn');
    fireEvent.click(editTemplateBtn);

    await waitFor(() => {
      expect(screen.getByText('Templates Docs View')).toBeDefined();
    });
  });

  it('toggles collapse and expand on folder items', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await waitFor(() => {
      expect(screen.getByText('Sub Chapter One')).toBeDefined();
    });

    const collapseBtn = screen.getByLabelText('Collapse Guide Overview');
    fireEvent.click(collapseBtn);

    expect(screen.queryByText('Sub Chapter One')).toBeNull();

    const expandBtn = screen.getByLabelText('Expand Guide Overview');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Sub Chapter One')).toBeDefined();
  });

  it('opens delete confirmation dialog and executes delete mutation for doc', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await waitFor(() => {
      expect(screen.getByText('Standalone Doc')).toBeDefined();
    });

    const deleteBtn = screen.getByTestId('delete-doc-3');
    fireEvent.click(deleteBtn);

    // Check dialog appears
    expect(screen.getByRole('heading', { name: 'Delete Doc' })).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete “Standalone Doc”?/i)).toBeDefined();

    // Mock delete API response
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/3', { method: 'DELETE' });
    });
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await waitFor(() => {
      expect(screen.getByText('Standalone Doc')).toBeDefined();
    });

    const deleteBtn = screen.getByTestId('delete-doc-3');
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('heading', { name: 'Delete Doc' })).toBeDefined();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Doc' })).toBeNull();
    });
  });

  it('filters docs based on status tab click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList();

    await waitFor(() => {
      expect(screen.getByText('Guide Overview')).toBeDefined();
      expect(screen.getByText('Review Chapter')).toBeDefined();
    });

    const inReviewTab = screen.getByTestId('status-tab-in_review');
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.getByText('Review Chapter')).toBeDefined();
      expect(screen.queryByText('Standalone Doc')).toBeNull();
    });
  });

  it('filters docs based on URL status param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList(['/docs?status=ready_for_publish']);

    await waitFor(() => {
      expect(screen.getByText('Ready Chapter')).toBeDefined();
      expect(screen.queryByText('Standalone Doc')).toBeNull();
      expect(screen.queryByText('Review Chapter')).toBeNull();
    });
  });

  it('renders correct badge colors for workflow statuses', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList();

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
