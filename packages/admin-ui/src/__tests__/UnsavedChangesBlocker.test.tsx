import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider, Link } from 'react-router-dom';
import { Settings } from '../pages/Settings';
import { createTestQueryClient } from '../test/test-utils';

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
    <QueryClientProvider client={createTestQueryClient()}>
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
    const user = userEvent.setup();
    renderSettingsWithOtherPage();
    await screen.findByDisplayValue('Original');

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));

    const otherPage = await screen.findByText('Other page');
    expect(otherPage.textContent).toBe('Other page');
    expect(screen.queryByDisplayValue('Original')).toBeNull();
  });

  it('shows a confirmation dialog when navigating with unsaved changes, and Stay keeps the page', async () => {
    const user = userEvent.setup();
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');
    await user.type(input, ' edited');

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));

    expect(await screen.findByRole('heading', { name: 'Unsaved changes' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Stay' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Unsaved changes' })).toBeNull();
    });
    expect(screen.queryByText('Other page')).toBeNull();
    const updatedInput = screen.getByDisplayValue('Original edited') as HTMLInputElement;
    expect(updatedInput.value).toBe('Original edited');
  });

  it('navigates away when the user chooses to leave without saving', async () => {
    const user = userEvent.setup();
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');
    await user.type(input, ' edited');

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));
    const leaveBtn = await screen.findByRole('button', { name: 'Leave without saving' });
    await user.click(leaveBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Unsaved changes' })).toBeNull();
    });
    const otherPage = await screen.findByText('Other page');
    expect(otherPage.textContent).toBe('Other page');
    expect(screen.queryByDisplayValue('Original edited')).toBeNull();
  });

  it('prevents tab close/refresh only while there are unsaved changes', async () => {
    const user = userEvent.setup();
    renderSettingsWithOtherPage();
    const input = await screen.findByDisplayValue('Original');

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await user.type(input, 'x');
    expect((input as HTMLInputElement).value).toBe('Originalx');

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });
});
