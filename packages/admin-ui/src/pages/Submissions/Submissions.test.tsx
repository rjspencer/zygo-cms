import '../../test/setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import { Submissions } from './Submissions';
import type { FormSubmission } from './types';

// Patch happy-dom's Request.prototype.body getter-only bug
try {
  let proto: any = typeof Request !== 'undefined' ? Request.prototype : null;
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, 'body');
    if (desc && !desc.set) {
      Object.defineProperty(proto, 'body', {
        get: desc.get,
        set(val: any) {
          Object.defineProperty(this, 'body', {
            value: val,
            writable: true,
            configurable: true,
          });
        },
        configurable: true,
      });
      break;
    }
    proto = Object.getPrototypeOf(proto);
  }
} catch {
  // ignore
}

const mockSubmissions: FormSubmission[] = [
  {
    id: 1,
    form_name: 'contact',
    page_path: '/contact',
    sender_name: 'John Doe',
    sender_email: 'john@example.com',
    subject: 'Project inquiry',
    message: 'Hello, I would like to build a new website with Zygo CMS.',
    metadata_json: JSON.stringify({ budget: '$5,000' }),
    status: 'unread',
    created_at: '2026-10-20 10:00:00',
  },
  {
    id: 2,
    form_name: 'newsletter',
    page_path: '/blog',
    sender_name: null,
    sender_email: 'subscriber@test.com',
    subject: null,
    message: 'Newsletter signup from blog footer',
    metadata_json: null,
    status: 'read',
    created_at: '2026-10-19 15:30:00',
  },
];

describe('Submissions Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/submissions/stats')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                total_count: 2,
                unread_count: 1,
                read_count: 1,
                archived_count: 0,
              }),
          });
        }
        if (url.includes('/api/submissions') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockSubmissions[0], status: 'read' }),
          });
        }
        if (url.includes('/api/submissions') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                submissions: mockSubmissions,
                total: 2,
                page: 1,
                per_page: 20,
                total_pages: 1,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <Theme>
          <QueryClientProvider client={queryClient}>
            <WebMCPProvider>
              <Submissions />
            </WebMCPProvider>
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    );
  };

  it('renders required page container and all test IDs', async () => {
    renderComponent();

    // Verify page container
    expect(screen.getByTestId('submissions-page')).not.toBeNull();

    // Verify search input
    const searchInput = screen.getByTestId('submissions-search-input');
    expect(searchInput.getAttribute('aria-label')).toBe('Search submissions');

    // Verify status filter tabs
    expect(screen.getByTestId('submissions-tab-all')).not.toBeNull();
    expect(screen.getByTestId('submissions-tab-unread')).not.toBeNull();
    expect(screen.getByTestId('submissions-tab-read')).not.toBeNull();
    expect(screen.getByTestId('submissions-tab-archived')).not.toBeNull();
    expect(screen.getByRole('tab', { name: /all/i }).getAttribute('data-state')).toBe('active');

    // Verify export button
    const exportBtn = screen.getByTestId('submissions-export-btn');
    expect(exportBtn.getAttribute('aria-label')).toBe('Export submissions as CSV');

    // Wait for submissions table
    const table = await screen.findByTestId('submissions-table');
    expect(table).not.toBeNull();
    expect(exportBtn.hasAttribute('disabled')).toBe(false);

    // Verify submission rows and textual content
    expect(screen.getByTestId('submission-row-1')).not.toBeNull();
    expect(screen.getByTestId('submission-row-2')).not.toBeNull();
    expect(screen.getByText('John Doe').textContent).toBe('John Doe');
    expect(screen.getByText('subscriber@test.com').textContent).toBe('subscriber@test.com');

    // Verify action buttons
    const toggleRead1 = screen.getByTestId('submission-toggle-read-1');
    expect(toggleRead1.getAttribute('aria-label')).toBe('Mark as read');

    const toggleRead2 = screen.getByTestId('submission-toggle-read-2');
    expect(toggleRead2.getAttribute('aria-label')).toBe('Mark as unread');

    const deleteBtn = screen.getByTestId('submission-delete-1');
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete submission');
  });

  it('opens submission detail dialog with safe rendering and sanitized mailto link', async () => {
    const user = userEvent.setup();
    renderComponent();

    const row1 = await screen.findByTestId('submission-row-1');
    expect(row1).not.toBeNull();

    // Click on row 1
    await user.click(row1);

    const modal = await screen.findByRole('dialog', { name: 'Project inquiry' });
    expect(modal.getAttribute('data-testid')).toBe('submission-detail-modal');
    expect(modal.getAttribute('aria-label')).toBe('Submission details');

    // Verify text content rendered safely
    expect(screen.getByText('Hello, I would like to build a new website with Zygo CMS.').textContent).toBe(
      'Hello, I would like to build a new website with Zygo CMS.'
    );

    // Verify mailto link is properly sanitized with encodeURIComponent
    const mailtoLink = screen.getByRole('link', { name: 'john@example.com' });
    expect(mailtoLink.getAttribute('href')).toBe('mailto:john%40example.com?subject=Re%3A%20Project%20inquiry');

    // Close Radix dialog and ensure removal from DOM to avoid Radix Presence teardown act warnings
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();

    // Await background query refetch triggered by automatic mark-as-read mutation to settle
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('handles toggle read/unread mutations', async () => {
    const user = userEvent.setup();
    renderComponent();

    const toggleBtn = await screen.findByTestId('submission-toggle-read-1');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Mark as read');

    await user.click(toggleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'read' }),
        })
      );
    });

    // Await refetch query invalidation to settle cleanly before ending test
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('handles delete mutation after confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderComponent();

    const deleteBtn = await screen.findByTestId('submission-delete-1');
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete submission');

    await user.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this submission?');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    // Await refetch query invalidation to settle cleanly before ending test
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    confirmSpy.mockRestore();
  });

  it('populates table when API returns items property from admin-api-worker', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/submissions/stats')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                total_count: 2,
                unread_count: 2,
              }),
          });
        }
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: mockSubmissions,
                total: 2,
                page: 1,
                per_page: 20,
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderComponent();

    const table = await screen.findByTestId('submissions-table');
    expect(table).not.toBeNull();
    expect(screen.getByTestId('submission-row-1')).not.toBeNull();
    expect(screen.getByTestId('submission-row-2')).not.toBeNull();
    expect(screen.getByText('John Doe').textContent).toBe('John Doe');
    expect(screen.getByText('subscriber@test.com').textContent).toBe('subscriber@test.com');
  });
});
