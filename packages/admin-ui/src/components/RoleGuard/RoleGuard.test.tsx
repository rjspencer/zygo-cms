import { render, screen } from '@testing-library/react';
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

    expect(screen.getByText('Loading access...').textContent).toBe('Loading access...');
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

    const content = await screen.findByText('Admin Content');
    expect(content.textContent).toBe('Admin Content');
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

    const denied = await screen.findByText(/Access Denied/i);
    expect(denied.textContent).toContain('Access Denied');
    expect(screen.queryByText('Admin Content')).toBeNull();
  });
});
