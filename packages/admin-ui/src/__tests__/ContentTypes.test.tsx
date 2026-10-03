import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentTypes } from '../pages/ContentTypes';
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

describe('ContentTypes component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches content types and displays them', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ([
        { id: 'post', name: 'Post', description: 'Blog post', schema_json: '[{}]' }
      ]),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ContentTypes />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Post')).toBeTruthy();
      expect(screen.getByText('1 fields')).toBeTruthy();
    });
  });

  it('opens create modal and saves', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ([]),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ContentTypes />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No content types found.')).toBeTruthy();
    });

    const newBtn = screen.getByRole('button', { name: /New Content Type/i });
    await userEvent.click(newBtn);

    expect(screen.getByText('Identifier (Slug)')).toBeTruthy();

    const slugInput = screen.getByPlaceholderText('e.g. products');
    const nameInput = screen.getByPlaceholderText('e.g. Products');
    
    await userEvent.type(slugInput, 'product');
    await userEvent.type(nameInput, 'Product');

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/content-types/product', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Product'),
      }));
    });
  });
});
