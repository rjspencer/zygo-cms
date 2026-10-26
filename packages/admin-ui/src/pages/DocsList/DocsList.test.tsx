import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

    screen.getByRole('heading', { name: 'Docs' });
    const editTemplateBtn = screen.getByRole('button', { name: /edit template & styles/i });
    expect(editTemplateBtn.hasAttribute('disabled')).toBe(false);

    const createBtn = screen.getByRole('button', { name: /create doc/i });
    expect(createBtn.hasAttribute('disabled')).toBe(false);

    const searchInput = screen.getByRole('textbox', { name: /search docs by title or slug/i });
    expect(searchInput.getAttribute('placeholder')).toBe('Search docs by title or slug...');

    const guideDoc = await screen.findByText('Guide Overview');
    expect(guideDoc.textContent).toBe('Guide Overview');
    expect(screen.getByText('Sub Chapter One').textContent).toBe('Sub Chapter One');
    expect(screen.getByText('Standalone Doc').textContent).toBe('Standalone Doc');
  });

  it('filters docs based on search input', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Guide Overview');

    const searchInput = screen.getByRole('textbox', {
      name: /search docs by title or slug/i,
    }) as HTMLInputElement;
    await user.click(searchInput);
    await user.paste('standalone');

    expect(searchInput.value).toBe('standalone');
    expect(screen.getByText('Standalone Doc').textContent).toBe('Standalone Doc');
    expect(screen.queryByText('Sub Chapter One')).toBeNull();
  });

  it('initializes search input from URL search param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList(['/docs?q=standalone']);

    const searchInput = screen.getByRole('textbox', {
      name: /search docs by title or slug/i,
    }) as HTMLInputElement;
    expect(searchInput.value).toBe('standalone');

    const standaloneDoc = await screen.findByText('Standalone Doc');
    expect(standaloneDoc.textContent).toBe('Standalone Doc');
    expect(screen.queryByText('Sub Chapter One')).toBeNull();
  });

  it('navigates to create doc view on button click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    renderDocsList();

    const createBtn = screen.getByRole('button', { name: /create doc/i });
    await user.click(createBtn);

    const newDocView = await screen.findByText('New Doc View');
    expect(newDocView.textContent).toBe('New Doc View');
  });

  it('navigates to template editor view on edit template button click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    renderDocsList();

    const editTemplateBtn = screen.getByRole('button', { name: /edit template & styles/i });
    await user.click(editTemplateBtn);

    const templateView = await screen.findByText('Templates Docs View');
    expect(templateView.textContent).toBe('Templates Docs View');
  });

  it('toggles collapse and expand on folder items', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Sub Chapter One');

    const collapseBtn = screen.getByRole('button', { name: 'Collapse Guide Overview' });
    await user.click(collapseBtn);

    expect(screen.queryByText('Sub Chapter One')).toBeNull();

    const expandBtn = screen.getByRole('button', { name: 'Expand Guide Overview' });
    await user.click(expandBtn);

    expect(screen.getByText('Sub Chapter One').textContent).toBe('Sub Chapter One');
  });

  it('opens delete confirmation dialog and executes delete mutation for doc', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Standalone Doc');

    const deleteBtn = screen.getByRole('button', { name: 'Delete Standalone Doc' });
    await user.click(deleteBtn);

    // Check dialog appears
    screen.getByRole('dialog');
    screen.getByRole('heading', { name: 'Delete Doc' });
    expect(screen.getByText(/Are you sure you want to delete/i).textContent).toContain('Standalone Doc');

    // Mock delete API response and subsequent refetch invalidation
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK',
    });
    const updatedEntries = mockDocsResponse.entries.filter((e) => e.id !== 3);
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: updatedEntries }),
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/entries/3', { method: 'DELETE' });
    });

    // Await dialog closing and invalidated query update
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(screen.queryByText('Standalone Doc')).toBeNull();
  });

  it('closes delete confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Standalone Doc');

    const deleteBtn = screen.getByRole('button', { name: 'Delete Standalone Doc' });
    await user.click(deleteBtn);

    screen.getByRole('dialog');
    screen.getByRole('heading', { name: 'Delete Doc' });

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters docs based on status tab click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Guide Overview');
    expect(screen.getByText('Review Chapter').textContent).toBe('Review Chapter');

    const inReviewTab = screen.getByRole('tab', { name: /in review/i });
    await user.click(inReviewTab);

    await waitFor(() => {
      expect(screen.getByText('Review Chapter').textContent).toBe('Review Chapter');
    });
    expect(screen.queryByText('Standalone Doc')).toBeNull();
  });

  it('filters docs based on URL status param', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList(['/docs?status=ready_for_publish']);

    const readyDoc = await screen.findByText('Ready Chapter');
    expect(readyDoc.textContent).toBe('Ready Chapter');
    expect(screen.queryByText('Standalone Doc')).toBeNull();
    expect(screen.queryByText('Review Chapter')).toBeNull();
  });

  it('renders correct badge colors for workflow statuses', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => workflowDocsResponse,
    });

    renderDocsList();

    await screen.findByText('Guide Overview');

    const inReviewBadge = screen.getByText('in review');
    expect(inReviewBadge.getAttribute('data-accent-color')).toBe('amber');

    const readyBadge = screen.getByText('ready for publish');
    expect(readyBadge.getAttribute('data-accent-color')).toBe('blue');

    const archivedBadge = screen.getByText('archived');
    expect(archivedBadge.getAttribute('data-accent-color')).toBe('red');
  });
});
