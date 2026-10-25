import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemePage } from './Theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => {
    if (!path) return 'https://example.com/';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `https://example.com${clean}`;
  }),
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

const renderThemePage = () => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [{ path: '/theme', element: <ThemePage /> }],
    { initialEntries: ['/theme'] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('ThemePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        active_preset: 'modern',
        font_family: 'system',
        accent_color: '#06b6d4',
      }),
    });
  });

  it('renders ThemeEditor on the theme page route', async () => {
    renderThemePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Modern Editorial' })).toBeDefined();
    });
  });
});
