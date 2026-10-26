import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeEditorPage } from './ThemeEditorPage';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => `https://example.com${path || ''}`),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockLockedTheme = {
  id: 'modern-editorial',
  name: 'Modern Editorial',
  description: 'Modern editorial typography with warm tones',
  is_locked: true,
  tokens: {
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    fontHeadline: "'Newsreader', Georgia, serif",
    fontBody: "'Inter', sans-serif",
    colorBg: '#faf8f5',
    colorSurface: '#ffffff',
    colorText: '#1c1917',
    colorAccent: '#991b1b',
    colorTextMuted: '#78716c',
    colorBorder: '#e7e5e4',
    maxWidth: '1920px',
    fontSizeBase: '18px',
    lineHeightBody: '1.75',
    headerLayout: 'centered',
    headerBorderStyle: 'double',
    headerTitleSize: '2rem',
    headerNavTransform: 'uppercase',
    headerPadding: '1.75rem 2rem',
    headerTagline: '',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
};

const mockCustomTheme = {
  id: 'custom-midnight',
  name: 'Custom Midnight',
  description: 'Dark moody aesthetics',
  is_locked: false,
  tokens: {
    ...mockLockedTheme.tokens,
    colorBg: '#111827',
    colorSurface: '#1f2937',
    colorText: '#f9fafb',
    colorAccent: '#38bdf8',
  },
};

const renderWithRouter = (initialPath: string) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/theme', element: <div>Themes List Page</div> },
      { path: '/theme/editor', element: <ThemeEditorPage /> },
      { path: '/theme/editor/:id', element: <ThemeEditorPage /> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('ThemeEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/themes/modern-editorial') {
        return Promise.resolve({
          ok: true,
          json: async () => mockLockedTheme,
        });
      }
      if (url === '/api/themes/custom-midnight') {
        return Promise.resolve({
          ok: true,
          json: async () => mockCustomTheme,
        });
      }
      if (url === '/api/themes/custom-midnight' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => mockCustomTheme,
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            theme_primary_id: 'modern-editorial',
            theme_active_name: 'Modern Editorial',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('redirects to /theme when navigating to /theme/editor without an ID', async () => {
    renderWithRouter('/theme/editor');

    const redirectTarget = await screen.findByText('Themes List Page');
    expect(redirectTarget.textContent).toBe('Themes List Page');
  });

  it('renders locked built-in theme with read-only badge and clone theme button', async () => {
    renderWithRouter('/theme/editor/modern-editorial');

    const heading = await screen.findByRole('heading', { name: 'Modern Editorial' });
    expect(heading.textContent).toBe('Modern Editorial');

    const readOnlyBadge = screen.getByText('Built-in (Read-Only)');
    expect(readOnlyBadge.textContent).toBe('Built-in (Read-Only)');

    const activeBadge = screen.getByText('Active Primary');
    expect(activeBadge.textContent).toBe('Active Primary');

    const cloneButton = screen.getByRole('button', { name: /Clone Theme/i });
    expect(cloneButton.hasAttribute('disabled')).toBe(false);

    const backButton = screen.getByRole('button', { name: /Back to Themes/i });
    expect(backButton.hasAttribute('disabled')).toBe(false);
  });

  it('calls duplicate API when Clone Theme is clicked', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/themes/modern-editorial' && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => mockLockedTheme,
        });
      }
      if (url === '/api/themes/modern-editorial/duplicate' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...mockLockedTheme,
            id: 'modern-editorial-copy',
            name: 'Modern Editorial (Copy)',
            is_locked: false,
          }),
        });
      }
      if (url === '/api/themes/modern-editorial-copy' && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...mockLockedTheme,
            id: 'modern-editorial-copy',
            name: 'Modern Editorial (Copy)',
            is_locked: false,
          }),
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ theme_primary_id: 'modern-editorial' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithRouter('/theme/editor/modern-editorial');

    const cloneButton = await screen.findByRole('button', { name: /Clone Theme/i });
    expect(cloneButton.hasAttribute('disabled')).toBe(false);

    await user.click(cloneButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/themes/modern-editorial/duplicate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    const newHeading = await screen.findByRole('heading', { name: 'Modern Editorial (Copy)' });
    expect(newHeading.textContent).toBe('Modern Editorial (Copy)');
  });

  it('renders custom theme and saves modifications via PUT /api/themes/:id', async () => {
    const user = userEvent.setup();
    renderWithRouter('/theme/editor/custom-midnight');

    const heading = await screen.findByRole('heading', { name: 'Custom Midnight' });
    expect(heading.textContent).toBe('Custom Midnight');

    const customBadge = screen.getByText('Custom');
    expect(customBadge.textContent).toBe('Custom');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    // Modify accent color hex to trigger dirty state
    const accentInput = screen.getByRole('textbox', { name: 'Accent hex code' });
    await user.clear(accentInput);
    await user.type(accentInput, '#06b6d4');
    expect(accentInput.getAttribute('value')).toBe('#06b6d4');

    expect(screen.getByText('Unsaved Edits').textContent).toBe('Unsaved Edits');
    expect(saveButton.hasAttribute('disabled')).toBe(false);

    await user.click(saveButton);

    const savedButton = await screen.findByRole('button', { name: /Saved!/i });
    expect(savedButton.textContent).toContain('Saved!');

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/themes/custom-midnight',
      expect.objectContaining({
        method: 'PUT',
      })
    );
  });

  it('supports inline rename for custom themes via PUT /api/themes/:id/rename', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/themes/custom-midnight' && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCustomTheme,
        });
      }
      if (url === '/api/themes/custom-midnight/rename' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...mockCustomTheme, name: 'Custom Midnight Renamed' }),
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ theme_primary_id: 'modern-editorial' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithRouter('/theme/editor/custom-midnight');

    const heading = await screen.findByRole('heading', { name: 'Custom Midnight' });
    expect(heading.textContent).toBe('Custom Midnight');

    const renameButton = screen.getByRole('button', { name: /Rename theme/i });
    await user.click(renameButton);

    const input = screen.getByRole('textbox', { name: /Theme name/i });
    await user.clear(input);
    await user.type(input, 'Custom Midnight Renamed');
    expect(input.getAttribute('value')).toBe('Custom Midnight Renamed');

    const saveRenameButton = screen.getByRole('button', { name: /Save theme name/i });
    await user.click(saveRenameButton);

    const updatedHeading = await screen.findByRole('heading', { name: 'Custom Midnight Renamed' });
    expect(updatedHeading.textContent).toBe('Custom Midnight Renamed');

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/themes/custom-midnight/rename',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Custom Midnight Renamed' }),
      })
    );
  });

  it('allows canceling inline rename without calling rename API', async () => {
    const user = userEvent.setup();
    renderWithRouter('/theme/editor/custom-midnight');

    const heading = await screen.findByRole('heading', { name: 'Custom Midnight' });
    expect(heading.textContent).toBe('Custom Midnight');

    const renameButton = screen.getByRole('button', { name: /Rename theme/i });
    await user.click(renameButton);

    const input = screen.getByRole('textbox', { name: /Theme name/i });
    await user.clear(input);
    await user.type(input, 'Different Name');

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByRole('textbox', { name: /Theme name/i })).toBeNull();

    const revertedHeading = screen.getByRole('heading', { name: 'Custom Midnight' });
    expect(revertedHeading.textContent).toBe('Custom Midnight');
  });

  it('displays error callout when theme fails to load', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/themes/broken-theme') {
        return Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ theme_primary_id: 'modern-editorial' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithRouter('/theme/editor/broken-theme');

    const errorMessage = await screen.findByText(/Theme not found/i);
    expect(errorMessage.textContent).toContain('Theme not found');

    errorSpy.mockRestore();
  });
});
