import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocsTemplateEditor } from './DocsTemplateEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { WebMCPProvider } from '../../providers/WebMCPProvider';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockDocTemplate = {
  id: 'doc',
  name: 'Docs Template',
  description: 'Three-column technical documentation layout with sidebar tree and table of contents.',
  template_html: '<div class="docs-layout"><aside class="docs-sidebar">{{ docs_tree_html|safe }}</aside><main class="docs-main">{{ doc.body_html|safe }}</main></div>',
  template_css: '.docs-layout { display: flex; }',
  is_locked: false,
};

const mockRevisions = [
  {
    id: 'rev-doc-1',
    layout_template_id: 'doc',
    template_html: '<div class="docs-layout"></div>',
    template_css: '.docs-layout { display: block; }',
    created_at: '2026-10-14 11:00:00',
  },
];

describe('DocsTemplateEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (initialTab: 'html' | 'css' = 'html') => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: '/templates/docs',
          element: <DocsTemplateEditor initialTab={initialTab} />,
        },
      ],
      { initialEntries: ['/templates/docs'] }
    );

    return render(
      <WebMCPProvider>
        <QueryClientProvider client={queryClient}>
          <Theme>
            <RouterProvider router={router} />
          </Theme>
        </QueryClientProvider>
      </WebMCPProvider>
    );
  };

  it('renders header, guidance, and tabs for HTML and CSS', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/layout-templates/doc') {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocTemplate,
        });
      }
      if (url === '/api/layout-templates/doc/revisions') {
        return Promise.resolve({
          ok: true,
          json: async () => mockRevisions,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(screen.getByText('Loading Docs template...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Docs Template' })).toBeDefined();
    });

    expect(screen.getByText(/Docs Layout & Navigation Architecture/i)).toBeDefined();
    expect(screen.getByTestId('tab-trigger-html')).toBeDefined();
    expect(screen.getByTestId('tab-trigger-css')).toBeDefined();
    expect(screen.getByTestId('docs-template-reset-btn')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId('docs-template-revisions-btn').textContent).toContain('Revisions (1)');
    });
  });

  it('switches between HTML and CSS tabs', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/layout-templates/doc') {
        return Promise.resolve({ ok: true, json: async () => mockDocTemplate });
      }
      if (url === '/api/layout-templates/doc/revisions') {
        return Promise.resolve({ ok: true, json: async () => mockRevisions });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('docs-template-html-editor')).toBeDefined();
    });

    await user.click(screen.getByTestId('tab-trigger-css'));
    expect(screen.getByTestId('docs-template-css-editor')).toBeDefined();
  });

  it('handles reset dialog confirmation', async () => {
    (apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/api/layout-templates/doc') {
        return Promise.resolve({ ok: true, json: async () => mockDocTemplate });
      }
      if (url === '/api/layout-templates/doc/revisions') {
        return Promise.resolve({ ok: true, json: async () => mockRevisions });
      }
      if (url === '/api/layout-templates/doc/reset' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...mockDocTemplate,
            template_css: '/* reset default */',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('docs-template-reset-btn')).toBeDefined();
    });

    await user.click(screen.getByTestId('docs-template-reset-btn'));

    expect(screen.getByText('Reset Docs Template to Default?')).toBeDefined();
    await user.click(screen.getByTestId('confirm-reset-btn'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/layout-templates/doc/reset', expect.objectContaining({ method: 'POST' }));
    });
  });
});
