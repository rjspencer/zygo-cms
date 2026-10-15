import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplatesList } from './TemplatesList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
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

const mockTemplates = [
  {
    id: 'post',
    name: 'Post Template',
    description: 'Standard post content',
    schema_json: '[{"name": "title", "type": "text"}]',
    template_html: '<h1>{{ title }}</h1>',
    template_css: '.post { color: black; }',
    is_locked: true,
  },
  {
    id: 'banner',
    name: 'Promo Banner',
    description: 'Marketing promo banner',
    schema_json: '[{"name": "promo_code", "type": "text"}]',
    template_html: '<div class="banner">{{ promo_code }}</div>',
    template_css: '.banner { background: yellow; }',
    is_locked: false,
  },
];

describe('TemplatesList Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (initialEntries = ['/templates']) => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        { path: '/templates', element: <TemplatesList /> },
        { path: '/templates/new', element: <div>New Template View</div> },
        { path: '/templates/:id', element: <div>Edit Template View</div> },
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

  it('renders templates list with content from API', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByText('Post Template')).toBeDefined();
    expect(screen.getByText('Promo Banner')).toBeDefined();
    expect(screen.getByText('post')).toBeDefined();
    expect(screen.getByText('banner')).toBeDefined();
  });

  it('admin role: shows lock toggle and enables all buttons', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByText('Lock Control')).toBeDefined();

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(2);
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].getAttribute('aria-checked')).toBe('false');

    const editButtons = screen.getAllByRole('button', { name: /^Edit / });
    expect(editButtons.length).toBe(2);
    expect(editButtons[0].getAttribute('disabled')).toBeNull();
    expect(editButtons[1].getAttribute('disabled')).toBeNull();

    const deleteButtons = screen.getAllByRole('button', { name: /^Delete / });
    expect(deleteButtons.length).toBe(2);
    expect(deleteButtons[0].getAttribute('disabled')).toBeNull();
    expect(deleteButtons[1].getAttribute('disabled')).toBeNull();
  });

  it('designer role: hides lock toggle and disables actions on locked templates', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'designer' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    await screen.findByText('Post Template');
    expect(screen.queryByText('Lock Control')).toBeNull();

    const editPost = screen.getByRole('button', { name: 'Edit Post Template' });
    expect(editPost.getAttribute('disabled')).not.toBeNull();

    const deletePost = screen.getByRole('button', { name: 'Delete Post Template' });
    expect(deletePost.getAttribute('disabled')).not.toBeNull();

    const editBanner = screen.getByRole('button', { name: 'Edit Promo Banner' });
    expect(editBanner.getAttribute('disabled')).toBeNull();

    const deleteBanner = screen.getByRole('button', { name: 'Delete Promo Banner' });
    expect(deleteBanner.getAttribute('disabled')).toBeNull();
  });

  it('filters templates by search query param', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent(['/templates?q=promo']);

    await screen.findByText('Promo Banner');
    expect(screen.queryByText('Post Template')).toBeNull();
  });

  it('filters templates when typing in search input', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    await screen.findByText('Post Template');
    const searchInput = screen.getByPlaceholderText('Search templates by name, slug, or description...');
    fireEvent.change(searchInput, { target: { value: 'banner' } });

    await waitFor(() => {
      expect(screen.getByText('Promo Banner')).toBeDefined();
      expect(screen.queryByText('Post Template')).toBeNull();
    });
  });

  it('toggles lock status when switch clicked by admin', async () => {
    (apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplates,
        });
      }
      if (url.startsWith('/api/content-types/banner') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    await screen.findByText('Post Template');
    const bannerSwitch = screen.getByRole('switch', { name: 'Toggle lock for Promo Banner' });
    fireEvent.click(bannerSwitch);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/banner',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
