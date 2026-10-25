import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

    await waitFor(() => {
      expect(screen.getByText('Themes List Page')).toBeDefined();
    });
  });

  it('renders locked built-in theme with read-only badge and duplicate button', async () => {
    renderWithRouter('/theme/editor/modern-editorial');

    await waitFor(() => {
      expect(screen.getAllByText('Modern Editorial').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Built-in (Read-Only)')).toBeDefined();
    expect(screen.getByRole('button', { name: /Duplicate to Edit/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Back to Themes/i })).toBeDefined();
  });

  it('renders custom theme and saves modifications via PUT /api/themes/:id', async () => {
    renderWithRouter('/theme/editor/custom-midnight');

    await waitFor(() => {
      expect(screen.getAllByText('Custom Midnight').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Custom')).toBeDefined();

    // Change a color input to trigger isDirty
    const accentInput = screen.getByLabelText('Color picker for Accent Color');
    fireEvent.change(accentInput, { target: { value: '#06b6d4' } });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDefined();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/themes/custom-midnight',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });
});
