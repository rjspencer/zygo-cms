import './test/setup';
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './test/mocks/server';
import { renderWithProviders } from './test/test-utils';
import { App } from './App';

describe('App Root Routing', () => {
  it('renders Dashboard at root path "/"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/' });

    const dashboardHeading = await screen.findByRole('heading', { name: /^dashboard$/i });
    expect(dashboardHeading.textContent).toBe('Dashboard');

    // Sidebar navigation is rendered with expected links
    expect(screen.getByRole('link', { name: /^posts$/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /^pages$/i })).not.toBeNull();

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('renders PostsList at "/posts"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/posts' });

    const postsHeading = await screen.findByRole('heading', { name: /^posts$/i });
    expect(postsHeading.textContent).toBe('Posts');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('renders PagesList at "/pages"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/pages' });

    const pagesHeading = await screen.findByRole('heading', { name: /^pages$/i });
    expect(pagesHeading.textContent).toBe('Pages');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('allows admin role to access role-guarded route "/submissions"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/submissions' });

    const submissionsHeading = await screen.findByRole('heading', { name: /submissions inbox/i });
    expect(submissionsHeading.textContent).toBe('Submissions Inbox');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('denies access to role-guarded route "/submissions" when user role is not authorized', async () => {
    server.use(
      http.get('*/api/me', () => {
        return HttpResponse.json({
          id: 99,
          email: 'author@zygodactyl.io',
          display_name: 'Staff Author',
          role: 'author',
        });
      })
    );

    const { queryClient } = renderWithProviders(<App />, { route: '/submissions' });

    const accessDeniedMsg = await screen.findByText(/access denied/i);
    expect(accessDeniedMsg.textContent).toContain('Access Denied. You do not have permission to view this page.');
    expect(screen.queryByRole('heading', { name: /submissions inbox/i })).toBeNull();

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('redirects "/admin" to root "/"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/admin' });

    const dashboardHeading = await screen.findByRole('heading', { name: /^dashboard$/i });
    expect(dashboardHeading.textContent).toBe('Dashboard');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('redirects "/theme/editor" to "/theme"', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/theme/editor' });

    const themesHeading = await screen.findByRole('heading', { name: /themes/i });
    expect(themesHeading.textContent).toContain('Theme');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('renders NotFound component for unknown routes', async () => {
    const { queryClient } = renderWithProviders(<App />, { route: '/unknown-route-that-does-not-exist' });

    const notFoundCode = await screen.findByRole('heading', { name: '404' });
    expect(notFoundCode.textContent).toBe('404');

    const notFoundTitle = screen.getByRole('heading', { name: 'Page Not Found' });
    expect(notFoundTitle.textContent).toBe('Page Not Found');

    const returnBtn = screen.getByRole('button', { name: /return to dashboard/i });
    expect(returnBtn.hasAttribute('disabled')).toBe(false);

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('allows navigation from Dashboard to Posts via sidebar navigation link', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<App />, { route: '/' });

    await screen.findByRole('heading', { name: /^dashboard$/i });

    const postsNavLink = screen.getByRole('link', { name: /^posts$/i });
    await user.click(postsNavLink);

    const postsHeading = await screen.findByRole('heading', { name: /^posts$/i });
    expect(postsHeading.textContent).toBe('Posts');

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });
});
