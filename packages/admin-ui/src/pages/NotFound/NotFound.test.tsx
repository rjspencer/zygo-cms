import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: '404' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeDefined();
    expect(
      screen.getByText('The administrative route you are looking for does not exist or has been moved.')
    ).toBeDefined();
  });

  it('navigates to dashboard when return button is clicked', () => {
    renderNotFound();

    const returnBtn = screen.getByRole('button', { name: /Return to Dashboard/i });
    expect(returnBtn).toBeDefined();

    fireEvent.click(returnBtn);

    expect(screen.getByText('Dashboard View')).toBeDefined();
  });
});
