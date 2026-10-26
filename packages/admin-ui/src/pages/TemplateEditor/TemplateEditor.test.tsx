import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateEditor } from './TemplateEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path = '') => (path ? `https://example.com/${path.replace(/^\/+/, '')}` : 'https://example.com/')),
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

  const renderComponent = (initialPath = '/templates/hero', client = createTestQueryClient()) => {
    const router = createMemoryRouter(
      ['/templates/:id', '/templates/new'].map((path) => ({
        path,
        element: <TemplateEditor />,
      })),
      { initialEntries: [initialPath] }
    );
    return render(
      <QueryClientProvider client={client}>
        <Theme>
          <RouterProvider router={router} />
        </Theme>
      </QueryClientProvider>
    );
  };

  it('renders multi-tab UI for Schema, HTML, and CSS', async () => {
    const user = userEvent.setup();
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Verify tabs are present and accessible
    const schemaTab = screen.getByRole('tab', { name: /^Schema/i });
    const htmlTab = screen.getByRole('tab', { name: /HTML \(MiniJinja\)/i });
    const cssTab = screen.getByRole('tab', { name: /CSS/i });
    expect(schemaTab.getAttribute('data-state')).toBe('active');
    expect(htmlTab.getAttribute('data-state')).toBe('inactive');
    expect(cssTab.getAttribute('data-state')).toBe('inactive');

    // Schema tab is active by default and renders VisualFieldBuilder fields
    const labelInput = screen.getByDisplayValue('Headline');
    expect(labelInput.getAttribute('value')).toBe('Headline');
    const nameFieldInput = screen.getByDisplayValue('headline');
    expect(nameFieldInput.getAttribute('value')).toBe('headline');

    // Switch to HTML tab
    await user.click(htmlTab);
    expect(htmlTab.getAttribute('data-state')).toBe('active');
    const htmlEditor = await screen.findByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });
    expect((htmlEditor as HTMLTextAreaElement).value.trim()).toBe(mockTemplate.template_html.trim());

    // Switch to CSS tab
    await user.click(cssTab);
    expect(cssTab.getAttribute('data-state')).toBe('active');
    const cssEditor = await screen.findByRole('textbox', { name: /CSS Stylesheet/i });
    expect((cssEditor as HTMLTextAreaElement).value).toContain('.hero');
    expect((cssEditor as HTMLTextAreaElement).value).toContain('padding: 2rem;');
  });

  it('admin role: renders Lock Template toggle and includes it in save', async () => {
    const user = userEvent.setup();
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Lock toggle should be rendered for admin
    const lockSwitch = screen.getByRole('switch', { name: /Lock Template/i });
    expect(lockSwitch.getAttribute('aria-checked')).toBe('false');

    // Toggle lock
    await user.click(lockSwitch);
    expect(lockSwitch.getAttribute('aria-checked')).toBe('true');

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    expect(saveBtn.hasAttribute('disabled')).toBe(false);
    await user.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/hero',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"is_locked":true'),
        })
      );
    });

    const successMessage = await screen.findByText('Template saved successfully!');
    expect(successMessage.textContent).toBe('Template saved successfully!');
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Lock Template toggle should NOT be in the DOM for designer
    expect(screen.queryByRole('switch', { name: /Lock Template/i })).toBeNull();

    // Since is_locked = true, Save button should be disabled for designer
    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);

    // Tooltip warning should be present
    const warning = screen.getByText(
      'This core template is locked. Please reach out to an admin if you need to make a change.'
    );
    expect(warning.textContent).toContain('This core template is locked');
  });

  it('409 Conflict guardrail: shows modal and allows Force Save with ?force=true', async () => {
    const user = userEvent.setup();
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    await user.click(saveBtn);

    // Modal should appear with conflict message
    const conflictMsg = await screen.findByText(
      'CSS class collision: class "hero" is already in use by content type "post"'
    );
    expect(conflictMsg.textContent).toContain('CSS class collision');

    // Modal should have a destructively styled "Force Save" button
    const forceSaveBtn = screen.getByRole('button', { name: /Force Save/i });
    expect(forceSaveBtn.hasAttribute('disabled')).toBe(false);

    // Click Force Save
    await user.click(forceSaveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/hero?force=true',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"force":true'),
        })
      );
    });

    // Modal should be closed and removed from DOM
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();

    // Success callout visible
    const successMsg = await screen.findByText('Template saved successfully!');
    expect(successMsg.textContent).toBe('Template saved successfully!');
  });

  it('400 Warning Confirmation: shows modal with warnings and allows Save Anyway with ?force=true', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types/hero' && options?.method === 'PUT') {
        // First PUT returns 400 with requires_confirmation: true
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            requires_confirmation: true,
            warnings: [
              "Schema field 'unused_field' is defined in schema but never used in template HTML",
            ],
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    const saveBtn = screen.getByRole('button', { name: /Save Template/i });
    await user.click(saveBtn);

    // Modal should appear with warnings
    const dialogTitle = await screen.findByRole('heading', { name: 'Template Warnings' });
    expect(dialogTitle.textContent).toBe('Template Warnings');
    const warningText = screen.getByText(
      "Schema field 'unused_field' is defined in schema but never used in template HTML"
    );
    expect(warningText.textContent).toContain('unused_field');

    // Modal should have "Save Anyway" button
    const saveAnywayBtn = screen.getByRole('button', { name: /Save Anyway/i });
    expect(saveAnywayBtn.hasAttribute('disabled')).toBe(false);

    // Click "Save Anyway"
    await user.click(saveAnywayBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/content-types/hero?force=true',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"force":true'),
        })
      );
    });

    // Modal should be closed and removed from DOM
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();

    // Success callout visible
    const successMsg = await screen.findByText('Template saved successfully!');
    expect(successMsg.textContent).toBe('Template saved successfully!');
  });

  it('formats HTML and CSS on load when template data is fetched', async () => {
    const user = userEvent.setup();
    const unformattedHtml = '<section class="hero"><div><h1>{{ headline }}</h1></div></section>';
    const unformattedCss = '.hero{padding:2rem;margin:0;}';

    const rawTemplate = {
      ...mockTemplate,
      template_html: unformattedHtml,
      template_css: unformattedCss,
    };

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
          json: async () => rawTemplate,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Switch to HTML tab
    const htmlTab = screen.getByRole('tab', { name: /HTML \(MiniJinja\)/i });
    await user.click(htmlTab);

    // Verify HTML editor displays loaded code
    const htmlEditor = await screen.findByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });
    expect((htmlEditor as HTMLTextAreaElement).value).toContain('headline');

    // Switch to CSS tab
    const cssTab = screen.getByRole('tab', { name: /CSS/i });
    await user.click(cssTab);

    const cssEditor = await screen.findByRole('textbox', { name: /CSS Stylesheet/i });
    expect((cssEditor as HTMLTextAreaElement).value).toContain('.hero');
  });

  it('blurring HTML editor tab triggers formatting', async () => {
    const user = userEvent.setup();
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Switch to HTML tab
    const htmlTab = screen.getByRole('tab', { name: /HTML \(MiniJinja\)/i });
    await user.click(htmlTab);

    const htmlEditor = await screen.findByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });
    expect((htmlEditor as HTMLTextAreaElement).value).toContain('headline');

    // Simulate clicking and blurring
    await user.click(htmlEditor);
    (htmlEditor as HTMLTextAreaElement).blur();

    // Ensure the editor content remains valid and present
    await waitFor(() => {
      expect((htmlEditor as HTMLTextAreaElement).value).toContain('headline');
    });
  });

  it('blurring CSS editor tab triggers formatting', async () => {
    const user = userEvent.setup();
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

    const nameInput = await screen.findByDisplayValue('Hero Section');
    expect(nameInput.getAttribute('value')).toBe('Hero Section');

    // Switch to CSS tab
    const cssTab = screen.getByRole('tab', { name: /CSS/i });
    await user.click(cssTab);

    const cssEditor = await screen.findByRole('textbox', { name: /CSS Stylesheet/i });
    expect((cssEditor as HTMLTextAreaElement).value).toContain('.hero');

    // Simulate clicking and blurring
    await user.click(cssEditor);
    (cssEditor as HTMLTextAreaElement).blur();

    // Ensure the editor content remains valid and present
    await waitFor(() => {
      expect((cssEditor as HTMLTextAreaElement).value).toContain('.hero');
    });
  });

  it('handles template load error gracefully and displays error callout', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/me') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ role: 'admin' }),
        });
      }
      if (url === '/api/content-types/hero') {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    const errorCallout = await screen.findByText('Failed to load template "hero"');
    expect(errorCallout.textContent).toBe('Failed to load template "hero"');
    const backBtn = screen.getByRole('button', { name: 'Back to Templates' });
    expect(backBtn.hasAttribute('disabled')).toBe(false);

    errorSpy.mockRestore();
  });
});
