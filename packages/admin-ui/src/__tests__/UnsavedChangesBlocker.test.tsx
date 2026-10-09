import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider, Link } from 'react-router-dom';
import { Settings } from '../pages/Settings';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../utils/api';

const renderSettingsWithOtherPage = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/settings',
        element: (
          <>
            <Settings />
            <Link to="/other">Go elsewhere</Link>
          </>
        ),
      },
      { path: '/other', element: <div>Other page</div> },
    ],
    { initialEntries: ['/settings'] }
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('Unsaved changes navigation blocker (Settings)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ site_title: 'Original' }),
    });
  });

  it('does not block navigation when there are no changes', async () => {
    renderSettingsWithOtherPage();
    await screen.findByDisplayValue('Original');

    await userEvent.click(screen.getByText('Go elsewhere'));

    expect(await screen.findByText('Other page')).toBeTruthy();
  });

  it('shows a confirmation dialog when navigating with unsaved changes, and Stay keeps the page', async () => {
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');
    await userEvent.type(input, ' edited');

    await userEvent.click(screen.getByText('Go elsewhere'));

    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Stay' }));

    await waitFor(() => expect(screen.queryByText('Unsaved changes')).toBeNull());
    expect(screen.queryByText('Other page')).toBeNull();
    expect(screen.getByDisplayValue('Original edited')).toBeTruthy();
  });

  it('navigates away when the user chooses to leave without saving', async () => {
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');
    await userEvent.type(input, ' edited');

    await userEvent.click(screen.getByText('Go elsewhere'));
    await userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }));

    expect(await screen.findByText('Other page')).toBeTruthy();
  });

  it('prevents tab close/refresh only while there are unsaved changes', async () => {
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await userEvent.type(input, 'x');

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });
});
