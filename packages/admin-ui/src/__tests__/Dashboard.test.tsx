import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render } from '../test/test-utils';
import { server } from '../test/mocks/server';
import Dashboard from '../pages/Dashboard';

describe('Dashboard Component Integration Tests', () => {
  it('renders header, metrics cards, and recent entries fetched via MSW', async () => {
    render(<Dashboard />);

    // Verify static header elements
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByText('Overview of your Zygo CMS content and edge operations')
    ).toBeInTheDocument();

    // Verify metrics fetched from MSW /api/admin/dashboard
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // total posts
      expect(screen.getByText('5')).toBeInTheDocument(); // total pages
    });

    expect(screen.getByText('Total Posts')).toBeInTheDocument();
    expect(screen.getByText('Total Pages')).toBeInTheDocument();
    expect(screen.getByText('Edge Status')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();

    // Verify recent content table rows from MSW /api/entries
    expect(await screen.findByText('First Blog Post')).toBeInTheDocument();
    expect(screen.getByText('About Zygo')).toBeInTheDocument();
    expect(screen.getByText('Draft Announcement')).toBeInTheDocument();
  });

  it('handles custom MSW responses dynamically', async () => {
    // Override the dashboard metrics handler for this test
    server.use(
      http.get('*/api/admin/dashboard', () => {
        return HttpResponse.json({
          post_count: 42,
          page_count: 17,
          author_count: 3,
        });
      }),
      http.get('*/api/entries', () => {
        return HttpResponse.json([
          {
            id: 99,
            title: 'Custom Injected Post',
            type: 'post',
            status: 'published',
            published_at: '2026-10-02 08:00:00',
          },
        ]);
      })
    );

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('17')).toBeInTheDocument();
    });

    expect(await screen.findByText('Custom Injected Post')).toBeInTheDocument();
  });

  it('handles API errors gracefully without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('*/api/admin/dashboard', () => {
        return HttpResponse.json({ error: 'Internal Error' }, { status: 500 });
      }),
      http.get('*/api/entries', () => {
        return HttpResponse.json({ error: 'Internal Error' }, { status: 500 });
      })
    );

    render(<Dashboard />);

    // Should fall back to 0 for posts and pages
    await waitFor(() => {
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('renders action buttons for New Post and View All', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Await initial entries load to avoid act() warning on state update
    expect(await screen.findByText('First Blog Post')).toBeInTheDocument();

    const newPostBtn = screen.getByRole('button', { name: /new post/i });
    expect(newPostBtn).toBeInTheDocument();

    const viewAllBtn = screen.getByRole('button', { name: /view all/i });
    expect(viewAllBtn).toBeInTheDocument();

    // Ensure buttons are clickable without error
    await user.click(newPostBtn);
    await user.click(viewAllBtn);
  });
});
