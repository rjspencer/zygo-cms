import '../../test/setup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    const postTemplate = await screen.findByText('Post Template');
    expect(postTemplate.textContent).toBe('Post Template');
    expect(screen.getByText('Promo Banner').textContent).toBe('Promo Banner');
    expect(screen.getByText('post').textContent).toBe('post');
    expect(screen.getByText('banner').textContent).toBe('banner');
  });

  it('renders preview link with correct attributes in the header', async () => {
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
          json: async () => [],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    const previewLink = screen.getByRole('link', {
      name: 'Preview all templates on the public site (opens in new tab)',
    });
    expect(previewLink.textContent).toBe('Preview');
    expect(previewLink.getAttribute('href')).toBe('/theme-preview');
    expect(previewLink.getAttribute('target')).toBe('_blank');
    expect(previewLink.getAttribute('rel')).toBe('noopener noreferrer');
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

    const lockControlHeader = await screen.findByRole('columnheader', { name: 'Lock Control' });
    expect(lockControlHeader.textContent).toBe('Lock Control');

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(2);
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].getAttribute('aria-checked')).toBe('false');

    const editButtons = screen.getAllByRole('button', { name: /^Edit / });
    expect(editButtons.length).toBe(2);
    expect(editButtons[0].hasAttribute('disabled')).toBe(false);
    expect(editButtons[1].hasAttribute('disabled')).toBe(false);

    const deleteButtons = screen.getAllByRole('button', { name: /^Delete / });
    expect(deleteButtons.length).toBe(2);
    expect(deleteButtons[0].hasAttribute('disabled')).toBe(false);
    expect(deleteButtons[1].hasAttribute('disabled')).toBe(false);
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
    expect(screen.queryByRole('columnheader', { name: 'Lock Control' })).toBeNull();

    const editPost = screen.getByRole('button', { name: 'Edit Post Template' });
    expect(editPost.hasAttribute('disabled')).toBe(true);

    const deletePost = screen.getByRole('button', { name: 'Delete Post Template' });
    expect(deletePost.hasAttribute('disabled')).toBe(true);

    const editBanner = screen.getByRole('button', { name: 'Edit Promo Banner' });
    expect(editBanner.hasAttribute('disabled')).toBe(false);

    const deleteBanner = screen.getByRole('button', { name: 'Delete Promo Banner' });
    expect(deleteBanner.hasAttribute('disabled')).toBe(false);
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

    const promoBanner = await screen.findByText('Promo Banner');
    expect(promoBanner.textContent).toBe('Promo Banner');
    expect(screen.queryByText('Post Template')).toBeNull();
  });

  it('filters templates when typing in search input', async () => {
    const user = userEvent.setup();
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
    const searchInput = screen.getByRole('textbox', {
      name: 'Search templates by name, slug, or description',
    }) as HTMLInputElement;
    await user.click(searchInput);
    await user.paste('banner');

    expect(searchInput.value).toBe('banner');
    expect(screen.getByText('Promo Banner').textContent).toBe('Promo Banner');
    expect(screen.queryByText('Post Template')).toBeNull();
  });

  it('toggles lock status when switch clicked by admin', async () => {
    const user = userEvent.setup();
    let templatesData = [...mockTemplates];
    (apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types' && (!opts || opts.method === 'GET' || !opts.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => templatesData,
        });
      }
      if (url.startsWith('/api/content-types/banner') && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        templatesData = templatesData.map((t) =>
          t.id === 'banner' ? { ...t, is_locked: body.is_locked } : t
        );
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
    expect(bannerSwitch.getAttribute('aria-checked')).toBe('false');

    await user.click(bannerSwitch);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/banner',
        expect.objectContaining({ method: 'PUT' })
      );
    });
    await waitFor(() => {
      expect(bannerSwitch.getAttribute('aria-checked')).toBe('true');
    });
  });
});
