import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemesList } from './ThemesList';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => `https://example.com${path || ''}`),
}));

const mockThemes = [
  {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    description: 'Modern editorial typography with warm tones',
    is_locked: true,
    tokens: {
      colorBg: '#faf8f5',
      colorSurface: '#ffffff',
      colorText: '#1c1917',
      colorAccent: '#991b1b',
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bento-brutalism-dark',
    name: 'Bento-Brutalism (Dark)',
    description: 'High-contrast dark variant with glowing cyan accents',
    is_locked: true,
    tokens: {
      colorBg: '#0b0f19',
      colorSurface: '#151d2f',
      colorText: '#f8fafc',
      colorAccent: '#38bdf8',
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'custom-summer',
    name: 'Custom Summer',
    description: 'Warm sunshine vibes',
    is_locked: false,
    tokens: {
      colorBg: '#fffdf0',
      colorSurface: '#ffffff',
      colorText: '#222222',
      colorAccent: '#eab308',
    },
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

const mockSettings = {
  theme_primary_id: 'modern-editorial',
  theme_dark_id: 'bento-brutalism-dark',
  theme_active_name: 'Modern Editorial',
};

const renderWithRouter = () => {
  const router = createMemoryRouter(
    [
      { path: '/theme', element: <ThemesList /> },
      { path: '/theme/editor/:id', element: <div>Theme Editor</div> },
    ],
    { initialEntries: ['/theme'] }
  );
  return render(
    <Theme>
      <RouterProvider router={router} />
    </Theme>
  );
};

describe('ThemesList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/themes' && (!options || options.method === undefined || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockThemes,
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => mockSettings,
        });
      }
      if (url === '/api/themes' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'new-theme',
            name: JSON.parse(options.body).name,
            description: JSON.parse(options.body).description,
            is_locked: false,
            tokens: mockThemes[0].tokens,
          }),
        });
      }
      if (url === '/api/themes/activate' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (url.includes('/rename') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (url.includes('/duplicate') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'custom-summer-copy',
            name: 'Custom Summer copy',
            is_locked: false,
            tokens: mockThemes[2].tokens,
          }),
        });
      }
      if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders themes page header, active pair cards, and themes table', async () => {
    renderWithRouter();

    const heading = await screen.findByRole('heading', { name: 'Themes' });
    expect(heading.tagName).toMatch(/^H[1-6]$/);

    expect(screen.getByText('Primary Theme (Default / Light)').textContent).toBe('Primary Theme (Default / Light)');
    expect(screen.getByText('Dark Mode Variant').textContent).toBe('Dark Mode Variant');

    // Table rows and cards
    expect(screen.getAllByText('Modern Editorial').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bento-Brutalism (Dark)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Custom Summer').textContent).toBe('Custom Summer');

    // Status badges
    expect(screen.getByText('Active Primary').textContent).toBe('Active Primary');
    expect(screen.getByText('Active Dark').textContent).toBe('Active Dark');
  });

  it('allows removing dark mode variant', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const removeBtn = await screen.findByRole('button', { name: 'Remove dark mode variant' });
    expect(removeBtn.hasAttribute('disabled')).toBe(false);

    await user.click(removeBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/activate', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: null, role: 'dark' }),
      }));
    });
  });

  it('opens Create Theme dialog and submits new theme', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const createBtn = await screen.findByRole('button', { name: /Create Theme/i });
    expect(createBtn.hasAttribute('disabled')).toBe(false);

    await user.click(createBtn);

    const dialogHeading = await screen.findByRole('heading', { name: 'Create New Theme' });
    expect(dialogHeading.tagName).toMatch(/^H[1-6]$/);

    const nameInput = screen.getByPlaceholderText('e.g. Minimalist Midnight');
    await user.type(nameInput, 'Minimalist Midnight');
    expect(nameInput.getAttribute('value')).toBe('Minimalist Midnight');

    const submitBtn = screen.getByRole('button', { name: 'Create Theme' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes', expect.objectContaining({
        method: 'POST',
      }));
    });

    const redirectedHeading = await screen.findByText('Theme Editor');
    expect(redirectedHeading.textContent).toBe('Theme Editor');
  });

  it('opens Activate Theme dialog and activates a theme as dark mode variant', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const activateBtn = await screen.findByRole('button', { name: 'Activate Custom Summer' });
    await user.click(activateBtn);

    const dialogHeading = await screen.findByRole('heading', { name: 'Activate Theme: Custom Summer' });
    expect(dialogHeading.tagName).toMatch(/^H[1-6]$/);

    // Select dark mode variant radio
    const darkRadio = screen.getByRole('radio', { name: 'Set as Dark Mode Variant' });
    await user.click(darkRadio);
    expect(darkRadio.getAttribute('data-state')).toBe('checked');

    const submitBtn = screen.getByRole('button', { name: 'Activate Theme' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/activate', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 'custom-summer', role: 'dark' }),
      }));
    });

    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens Rename Theme dialog and renames a custom theme', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const renameBtn = await screen.findByRole('button', { name: 'Rename Custom Summer' });
    await user.click(renameBtn);

    const dialogHeading = await screen.findByRole('heading', { name: 'Rename Theme' });
    expect(dialogHeading.tagName).toMatch(/^H[1-6]$/);

    const input = screen.getByDisplayValue('Custom Summer');
    await user.clear(input);
    await user.type(input, 'Golden Summer');
    expect(input.getAttribute('value')).toBe('Golden Summer');

    const saveBtn = screen.getByRole('button', { name: 'Rename' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer/rename', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Golden Summer' }),
      }));
    });

    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('duplicates a theme when Duplicate button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const duplicateBtn = await screen.findByRole('button', { name: 'Duplicate Custom Summer' });
    expect(duplicateBtn.hasAttribute('disabled')).toBe(false);

    await user.click(duplicateBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer/duplicate', expect.objectContaining({
        method: 'POST',
      }));
    });

    const redirectedHeading = await screen.findByText('Theme Editor');
    expect(redirectedHeading.textContent).toBe('Theme Editor');
  });

  it('opens Delete Theme dialog and confirms deletion for inactive custom theme', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const deleteBtn = await screen.findByRole('button', { name: 'Delete Custom Summer' });
    await user.click(deleteBtn);

    const dialogHeading = await screen.findByRole('heading', { name: /Delete Theme/i });
    expect(dialogHeading.tagName).toMatch(/^H[1-6]$/);

    const confirmBtn = screen.getByRole('button', { name: 'Delete Theme' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays error callout when themes fail to load', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/themes') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithRouter();

    const errorCallout = await screen.findByText('Failed to fetch themes: Internal Server Error');
    expect(errorCallout.textContent).toBe('Failed to fetch themes: Internal Server Error');

    errorSpy.mockRestore();
  });
});
