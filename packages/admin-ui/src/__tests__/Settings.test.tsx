import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from '../pages/Settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const SettingsWithRouter = () => {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <Settings /> }])
  );
  return <RouterProvider router={router} />;
};

describe('Settings component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings and displays them', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
      expect(screen.getByDisplayValue('https://test.example.com')).toBeTruthy();
      expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
    });
  });

  it('disables save button when there are no changes, and enables when dirty', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'false',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.type(titleInput, ' Updated');

    expect(saveButton.disabled).toBe(false);
  });

  it('saves settings correctly with batch format', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'false',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            site_title: 'New Title',
            canonical_origin: 'https://test.example.com',
            description: 'Test Description',
            analytics_enabled: 'false',
            docs_mode_enabled: 'false',
            docs_path: '/docs',
          },
        }),
      });
    });
  });

  it('displays user-facing error message when saving fails', async () => {
    (apiFetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Database connection failed',
        }),
      });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.type(titleInput, ' Error Test');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeTruthy();
    });
  });

  it('displays Public Site configured from VITE_PUBLIC_SITE_URL in edge environment card', async () => {
    import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Public Site')).toBeTruthy();
      expect(screen.getByText('https://zygodactylstudios.com')).toBeTruthy();
    });

    import.meta.env.VITE_PUBLIC_SITE_URL = '';
  });
});
