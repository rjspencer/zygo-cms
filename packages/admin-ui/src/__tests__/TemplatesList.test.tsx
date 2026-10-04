import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplatesList } from '../pages/TemplatesList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { apiFetch } from '../utils/api';

vi.mock('../utils/api', () => ({
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

describe('TemplatesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (client = createTestQueryClient()) => {
    return render(
      <QueryClientProvider client={client}>
        <Theme>
          <MemoryRouter>
            <TemplatesList />
          </MemoryRouter>
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

    expect(await screen.findByText('Post Template')).toBeDefined();

    // Lock controls should be visible for admin
    const lockToggles = screen.getAllByRole('switch');
    expect(lockToggles.length).toBe(2);

    // Edit and Delete buttons should be enabled for all items
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    expect(editButtons.length).toBe(2);
    editButtons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    expect(deleteButtons.length).toBe(2);
    deleteButtons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('admin role: toggling lock calls PUT /api/content-types/:id', async () => {
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
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
      if (url.startsWith('/api/content-types/banner') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    await screen.findByText('Promo Banner');

    const toggle = screen.getByRole('switch', { name: /Toggle lock for Promo Banner/i });
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/banner',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"is_locked":true'),
        })
      );
    });
  });

  it('designer role: hides lock toggle, disables buttons for locked templates with tooltip', async () => {
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

    expect(await screen.findByText('Post Template')).toBeDefined();

    // Lock toggle should NOT be visible for designer
    expect(screen.queryByRole('switch')).toBeNull();

    // For locked template 'post', Edit and Delete buttons should be disabled
    const editPostBtn = screen.getByRole('button', { name: /Edit Post Template/i });
    expect((editPostBtn as HTMLButtonElement).disabled).toBe(true);

    const deletePostBtn = screen.getByRole('button', { name: /Delete Post Template/i });
    expect((deletePostBtn as HTMLButtonElement).disabled).toBe(true);

    // For unlocked template 'banner', Edit and Delete buttons should be enabled
    const editBannerBtn = screen.getByRole('button', { name: /Edit Promo Banner/i });
    expect((editBannerBtn as HTMLButtonElement).disabled).toBe(false);

    const deleteBannerBtn = screen.getByRole('button', { name: /Delete Promo Banner/i });
    expect((deleteBannerBtn as HTMLButtonElement).disabled).toBe(false);
  });
});
