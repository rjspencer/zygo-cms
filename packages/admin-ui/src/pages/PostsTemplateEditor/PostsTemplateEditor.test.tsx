import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostsTemplateEditor } from './PostsTemplateEditor';
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

const mockPostTemplate = {
  id: 'post',
  name: 'Posts Template',
  description: 'Layout and styles for single blog post articles and the /posts archive page.',
  template_html: '<article><h1>{{ post.title }}</h1><div class="prose">{{ post.body_html|safe }}</div></article>',
  template_css: '.posts-list { display: flex; flex-direction: column; }',
  is_locked: false,
};

const mockRevisions = [
  {
    id: 'rev-1',
    layout_template_id: 'post',
    template_html: '<article><h1>{{ post.title }}</h1></article>',
    template_css: '.posts-list { display: block; }',
    created_at: '2026-10-14 10:00:00',
  },
];

describe('PostsTemplateEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (initialTab: 'html' | 'css' = 'html') => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: '/templates/posts',
          element: <PostsTemplateEditor initialTab={initialTab} />,
        },
      ],
      { initialEntries: ['/templates/posts'] }
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
      if (url === '/api/layout-templates/post') {
        return Promise.resolve({
          ok: true,
          json: async () => mockPostTemplate,
        });
      }
      if (url === '/api/layout-templates/post/revisions') {
        return Promise.resolve({
          ok: true,
          json: async () => mockRevisions,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(screen.getByText('Loading Posts template...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Posts Template' })).toBeDefined();
    });

    expect(screen.getByText(/Posts Layout & Styling Architecture/i)).toBeDefined();
    expect(screen.getByTestId('tab-trigger-html')).toBeDefined();
    expect(screen.getByTestId('tab-trigger-css')).toBeDefined();
    expect(screen.getByTestId('posts-template-reset-btn')).toBeDefined();
    expect(screen.getByTestId('posts-template-revisions-btn').textContent).toContain('Revisions (1)');
  });

  it('switches between HTML and CSS tabs', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/layout-templates/post') {
        return Promise.resolve({ ok: true, json: async () => mockPostTemplate });
      }
      if (url === '/api/layout-templates/post/revisions') {
        return Promise.resolve({ ok: true, json: async () => mockRevisions });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('posts-template-html-editor')).toBeDefined();
    });

    await user.click(screen.getByTestId('tab-trigger-css'));
    expect(screen.getByTestId('posts-template-css-editor')).toBeDefined();
  });

  it('handles reset dialog confirmation', async () => {
    (apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/api/layout-templates/post') {
        return Promise.resolve({ ok: true, json: async () => mockPostTemplate });
      }
      if (url === '/api/layout-templates/post/revisions') {
        return Promise.resolve({ ok: true, json: async () => mockRevisions });
      }
      if (url === '/api/layout-templates/post/reset' && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...mockPostTemplate,
            template_css: '/* reset default */',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('posts-template-reset-btn')).toBeDefined();
    });

    await user.click(screen.getByTestId('posts-template-reset-btn'));

    expect(screen.getByText('Reset Posts Template to Default?')).toBeDefined();
    await user.click(screen.getByTestId('confirm-reset-btn'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/layout-templates/post/reset', expect.objectContaining({ method: 'POST' }));
    });
  });
});
