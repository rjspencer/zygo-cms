import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from '../pages/Settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

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
          <Settings />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
      expect(screen.getByDisplayValue('https://test.example.com')).toBeTruthy();
      expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
    });
  });

  it('saves settings correctly', async () => {
    (apiFetch as any).mockResolvedValue({
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
          <Settings />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Title'),
      }));
    });
  });
});
