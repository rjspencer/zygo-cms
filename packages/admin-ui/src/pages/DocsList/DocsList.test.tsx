import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
});
