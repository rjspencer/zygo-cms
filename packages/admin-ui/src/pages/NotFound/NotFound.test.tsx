import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotFound } from './NotFound';
import { Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const renderNotFound = () => {
  const router = createMemoryRouter(
    [
      { path: '/404', element: <NotFound /> },
      { path: '/', element: <div>Dashboard View</div> },
    ],
    { initialEntries: ['/404'] }
  );

  return render(
    <Theme>
      <RouterProvider router={router} />
    </Theme>
  );
};

describe('NotFound Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 heading and explanatory message', () => {
    renderNotFound();

    const codeHeading = screen.getByRole('heading', { name: '404' });
    const titleHeading = screen.getByRole('heading', { name: 'Page Not Found' });
    const message = screen.getByText(
      'The administrative route you are looking for does not exist or has been moved.'
    );
    const returnBtn = screen.getByRole('button', { name: /return to dashboard/i });

    expect(codeHeading.textContent).toBe('404');
    expect(titleHeading.textContent).toBe('Page Not Found');
    expect(message.textContent).toContain('administrative route');
    expect(returnBtn.hasAttribute('disabled')).toBe(false);
  });

  it('navigates to dashboard when return button is clicked', async () => {
    const user = userEvent.setup();
    renderNotFound();

    const returnBtn = screen.getByRole('button', { name: /return to dashboard/i });
    expect(returnBtn.hasAttribute('disabled')).toBe(false);

    await user.click(returnBtn);

    const dashboardView = await screen.findByText('Dashboard View');
    expect(dashboardView.textContent).toBe('Dashboard View');
    expect(screen.queryByRole('heading', { name: '404' })).toBeNull();
    expect(screen.queryByRole('button', { name: /return to dashboard/i })).toBeNull();
  });
});
