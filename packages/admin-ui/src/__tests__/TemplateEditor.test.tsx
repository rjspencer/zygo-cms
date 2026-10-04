import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateEditor } from '../pages/TemplateEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

const mockTemplate = {
  id: 'hero',
  name: 'Hero Section',
  description: 'Hero header component',
  schema_json: '[{"name": "headline", "type": "text", "label": "Headline"}]',
  template_html: '<section class="hero"><h1>{{ headline }}</h1></section>',
  template_css: '.hero { padding: 2rem; }',
  is_locked: false,
};

describe('TemplateEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (initialPath = '/admin/templates/hero', client = createTestQueryClient()) => {
    return render(
      <QueryClientProvider client={client}>
        <Theme>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/admin/templates/:id" element={<TemplateEditor />} />
              <Route path="/admin/templates/new" element={<TemplateEditor />} />
            </Routes>
          </MemoryRouter>
        </Theme>
      </QueryClientProvider>
    );
  };

  it('renders multi-tab UI for Schema, HTML, and CSS', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types/hero') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplate,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByDisplayValue('Hero Section')).toBeDefined();

    // Verify tabs are present
    expect(screen.getByRole('tab', { name: /Schema \(JSON\)/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /HTML \(MiniJinja\)/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /CSS/i })).toBeDefined();

    // Schema tab is active by default
    expect(screen.getByDisplayValue(mockTemplate.schema_json)).toBeDefined();

    // Switch to HTML tab
    const htmlTab = screen.getByRole('tab', { name: /HTML \(MiniJinja\)/i });
    await userEvent.click(htmlTab);
    expect(await screen.findByDisplayValue(mockTemplate.template_html)).toBeDefined();

    // Switch to CSS tab
    const cssTab = screen.getByRole('tab', { name: /CSS/i });
    await userEvent.click(cssTab);
    expect(await screen.findByDisplayValue(mockTemplate.template_css)).toBeDefined();
  });

  it('admin role: renders Lock Template toggle and includes it in save', async () => {
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types/hero') {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplate,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByDisplayValue('Hero Section')).toBeDefined();

    // Lock toggle should be rendered for admin
    const lockSwitch = screen.getByRole('switch', { name: /Lock Template/i });
    expect(lockSwitch).toBeDefined();
    expect(lockSwitch.getAttribute('aria-checked')).toBe('false');

    // Toggle lock
    await userEvent.click(lockSwitch);
    expect(lockSwitch.getAttribute('aria-checked')).toBe('true');

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/hero',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"is_locked":true'),
        })
      );
    });
  });

  it('designer role: completely hides Lock Template toggle and locks core templates', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'designer' }),
        });
      }
      if (url === '/api/content-types/hero') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockTemplate, is_locked: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByDisplayValue('Hero Section')).toBeDefined();

    // Lock Template toggle should NOT be in the DOM for designer
    expect(screen.queryByRole('switch', { name: /Lock Template/i })).toBeNull();

    // Since is_locked = true, Save button should be disabled for designer
    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);

    // Tooltip warning should be present
    expect(
      screen.getAllByText(
        'This core template is locked. Please reach out to an admin if you need to make a change.'
      ).length
    ).toBeGreaterThan(0);
  });

  it('409 Conflict guardrail: shows modal and allows Force Save with ?force=true', async () => {
    let putCount = 0;
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types/hero' && options?.method === 'PUT') {
        putCount++;
        // First PUT returns 409 Conflict
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'CSS class collision: class "hero" is already in use by content type "post"',
          }),
        });
      }
      if (url === '/api/content-types/hero?force=true' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (url === '/api/content-types/hero') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTemplate,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    expect(await screen.findByDisplayValue('Hero Section')).toBeDefined();

    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    await userEvent.click(saveBtn);

    // Modal should appear with conflict message
    expect(
      await screen.findByText(
        'CSS class collision: class "hero" is already in use by content type "post"'
      )
    ).toBeDefined();

    // Modal should have a destructively styled "Force Save" button
    const forceSaveBtn = screen.getByRole('button', { name: /Force Save/i });
    expect(forceSaveBtn).toBeDefined();

    // Click Force Save
    await userEvent.click(forceSaveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/hero?force=true',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"force":true'),
        })
      );
    });

    // Modal should be closed and success callout visible
    expect(await screen.findByText('Template saved successfully!')).toBeDefined();
  });
});
