import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    [{ path: '/theme', element: <ThemesList /> }],
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

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Themes' })).toBeDefined();
    });

    expect(screen.getByText('Primary Theme (Default / Light)')).toBeDefined();
    expect(screen.getByText('Dark Mode Variant')).toBeDefined();

    // Table rows and cards
    expect(screen.getAllByText('Modern Editorial').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bento-Brutalism (Dark)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Custom Summer')).toBeDefined();

    // Status badges
    expect(screen.getByText('Active Primary')).toBeDefined();
    expect(screen.getByText('Active Dark')).toBeDefined();
  });

  it('allows removing dark mode variant', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('Remove dark mode variant')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Remove dark mode variant'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/activate', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: null, role: 'dark' }),
      }));
    });
  });

  it('opens Create Theme dialog and submits new theme', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Theme/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Theme/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create New Theme' })).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Minimalist Midnight');
    fireEvent.change(nameInput, { target: { value: 'Minimalist Midnight' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Theme' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('opens Activate Theme dialog and activates a theme as dark mode variant', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('Activate Custom Summer')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Activate Custom Summer'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activate Theme: Custom Summer' })).toBeDefined();
    });

    // Select dark mode variant radio
    const darkRadio = screen.getByRole('radio', { name: 'Set as Dark Mode Variant' });
    fireEvent.click(darkRadio);

    const activateBtn = screen.getByRole('button', { name: 'Activate Theme' });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/activate', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 'custom-summer', role: 'dark' }),
      }));
    });
  });

  it('opens Rename Theme dialog and renames a custom theme', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('Rename Custom Summer')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Rename Custom Summer'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rename Theme' })).toBeDefined();
    });

    const input = screen.getByDisplayValue('Custom Summer');
    fireEvent.change(input, { target: { value: 'Golden Summer' } });

    const saveBtn = screen.getByRole('button', { name: 'Rename' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer/rename', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Golden Summer' }),
      }));
    });
  });

  it('duplicates a theme when Duplicate button is clicked', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('Duplicate Custom Summer')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Duplicate Custom Summer'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer/duplicate', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('opens Delete Theme dialog and confirms deletion for inactive custom theme', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByLabelText('Delete Custom Summer')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Delete Custom Summer'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Delete Theme/i })).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Delete Theme' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/themes/custom-summer', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
});
