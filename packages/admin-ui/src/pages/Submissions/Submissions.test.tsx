import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    expect(screen.getByTestId('submissions-page')).toBeDefined();

    // Verify search input
    const searchInput = screen.getByTestId('submissions-search-input');
    expect(searchInput).toBeDefined();
    expect(searchInput.getAttribute('aria-label')).toBe('Search submissions');

    // Verify status filter tabs
    expect(screen.getByTestId('submissions-tab-all')).toBeDefined();
    expect(screen.getByTestId('submissions-tab-unread')).toBeDefined();
    expect(screen.getByTestId('submissions-tab-read')).toBeDefined();
    expect(screen.getByTestId('submissions-tab-archived')).toBeDefined();

    // Verify export button
    const exportBtn = screen.getByTestId('submissions-export-btn');
    expect(exportBtn).toBeDefined();
    expect(exportBtn.getAttribute('aria-label')).toBe('Export submissions as CSV');

    // Wait for submissions table
    await waitFor(() => {
      expect(screen.getByTestId('submissions-table')).toBeDefined();
    });

    // Verify submission rows
    expect(screen.getByTestId('submission-row-1')).toBeDefined();
    expect(screen.getByTestId('submission-row-2')).toBeDefined();

    // Verify action buttons
    const toggleRead1 = screen.getByTestId('submission-toggle-read-1');
    expect(toggleRead1).toBeDefined();
    expect(toggleRead1.getAttribute('aria-label')).toBe('Mark as read');

    const toggleRead2 = screen.getByTestId('submission-toggle-read-2');
    expect(toggleRead2).toBeDefined();
    expect(toggleRead2.getAttribute('aria-label')).toBe('Mark as unread');

    const deleteBtn = screen.getByTestId('submission-delete-1');
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete submission');
  });

  it('opens submission detail dialog with safe rendering and sanitized mailto link', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('submission-row-1')).toBeDefined();
    });

    // Click on row 1
    fireEvent.click(screen.getByTestId('submission-row-1'));

    await waitFor(() => {
      const modal = screen.getByTestId('submission-detail-modal');
      expect(modal).toBeDefined();
      expect(modal.getAttribute('aria-label')).toBe('Submission details');
    });

    // Verify text content rendered safely
    expect(screen.getByText('Hello, I would like to build a new website with Zygo CMS.')).toBeDefined();

    // Verify mailto link is properly sanitized with encodeURIComponent
    const mailtoLink = screen.getByRole('link', { name: 'john@example.com' });
    expect(mailtoLink).toBeDefined();
    expect(mailtoLink.getAttribute('href')).toBe('mailto:john%40example.com?subject=Re%3A%20Project%20inquiry');
  });

  it('handles toggle read/unread mutations', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('submission-toggle-read-1')).toBeDefined();
    });

    const toggleBtn = screen.getByTestId('submission-toggle-read-1');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'read' }),
        })
      );
    });
  });

  it('handles delete mutation after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('submission-delete-1')).toBeDefined();
    });

    const deleteBtn = screen.getByTestId('submission-delete-1');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
