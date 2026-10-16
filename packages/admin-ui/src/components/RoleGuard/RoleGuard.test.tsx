import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { RoleGuard } from './RoleGuard';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
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

describe('RoleGuard component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state while fetching access info', () => {
    (apiFetch as any).mockReturnValue(new Promise(() => {}));
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Theme>
          <RoleGuard allowedRoles={['admin']}>
            <div>Admin Content</div>
          </RoleGuard>
        </Theme>
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading access...')).toBeDefined();
    expect(screen.queryByText('Admin Content')).toBeNull();
  });

  it('renders children when role is allowed', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'admin' }),
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Theme>
          <RoleGuard allowedRoles={['admin']}>
            <div>Admin Content</div>
          </RoleGuard>
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeDefined();
    });
    expect(screen.queryByText('Loading access...')).toBeNull();
    expect(screen.queryByText(/Access Denied/i)).toBeNull();
  });

  it('renders access denied message when role is not allowed', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'author' }),
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Theme>
          <RoleGuard allowedRoles={['admin']}>
            <div>Admin Content</div>
          </RoleGuard>
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Access Denied/i)).toBeDefined();
    });
    expect(screen.queryByText('Admin Content')).toBeNull();
  });
});
