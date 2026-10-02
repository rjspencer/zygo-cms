import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Navigation } from '../pages/Navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

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

describe('Navigation component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches menus and displays them', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          items_json: JSON.stringify([{ title: 'Home', url: '/', target: '_self', children: [] }])
        },
        footer: {
          items_json: JSON.stringify([{ title: 'Privacy', url: '/privacy', target: '_self', children: [] }])
        }
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });
  });

  it('adds a new link and saves', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        header: {
          items_json: JSON.stringify([{ title: 'Home', url: '/', target: '_self', children: [] }])
        },
        footer: {
          items_json: JSON.stringify([{ title: 'Privacy', url: '/privacy', target: '_self', children: [] }])
        }
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    const labelInput = screen.getByPlaceholderText('e.g. Documentation');
    const urlInput = screen.getByPlaceholderText('e.g. /docs or https://...');
    
    await userEvent.type(labelInput, 'About');
    await userEvent.type(urlInput, '/about');
    
    const addButton = screen.getByRole('button', { name: /Add Link/i });
    await userEvent.click(addButton);

    expect(screen.getByText('About')).toBeTruthy();

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/menus/header', expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('About'),
      }));
    });
  });
});
