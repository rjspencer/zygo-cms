import '../test/setup';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import { Submissions } from '../pages/Submissions';
import { sanitizeCsvCell, exportSubmissionsToCsv } from '../pages/Submissions/utils/csvExport';
import * as apiModule from '../utils/api';
import type { FormSubmission } from '../pages/Submissions/types';

describe('CSV Sanitization & Export (csvExport.ts)', () => {
  describe('sanitizeCsvCell - CSV Formula Injection Defense', () => {
    it('prefixes formula triggers with an apostrophe', () => {
      // DDE trigger characters: =, +, -, @, \t, \r
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(sanitizeCsvCell('+cmd|\' /C calc\'!A0')).toBe('"\' +cmd|\' /C calc\'!A0"'.replace(/ \+/, '+'));
      expect(sanitizeCsvCell('+cmd|')).toBe('"\' +cmd|"'.replace(/ \+/, '+'));
      expect(sanitizeCsvCell('-5+2')).toBe('"\' -5+2"'.replace(/ -/, '-'));
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe('"\'@SUM(1+1)"');
      expect(sanitizeCsvCell('\tTabIndented')).toBe('"\'\tTabIndented"');
      expect(sanitizeCsvCell('\rCarriageReturn')).toBe('"\'\rCarriageReturn"');
    });

    it('escapes standard values and existing double quotes per RFC 4180', () => {
      expect(sanitizeCsvCell('Hello World')).toBe('"Hello World"');
      expect(sanitizeCsvCell('She said "Hello"')).toBe('"She said ""Hello"""');
      expect(sanitizeCsvCell(12345)).toBe('"12345"');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  describe('exportSubmissionsToCsv', () => {
    let originalCreateObjectURL: any;
    let originalRevokeObjectURL: any;
    let createdBlob: Blob | null = null;

    beforeEach(() => {
      createdBlob = null;
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn().mockImplementation((blob) => {
        createdBlob = blob;
        return 'blob:http://localhost:3000/mock-blob';
      });
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('creates CSV file with RFC 4180 headers and formula-sanitized values', async () => {
      const submissions: FormSubmission[] = [
        {
          id: 1,
          form_name: 'contact',
          page_path: '/contact',
          sender_name: '=DangerousFormula',
          sender_email: 'attacker@example.com',
          subject: '+SUM(1+1)',
          message: 'Safe message here',
          metadata_json: '{"source":"web"}',
          status: 'unread',
          created_at: '2026-10-20T10:00:00Z',
        },
      ];

      exportSubmissionsToCsv(submissions, 'test-export.csv');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(createdBlob).not.toBeNull();
      expect(createdBlob?.type).toBe('text/csv;charset=utf-8;');

      const text = await createdBlob!.text();
      // Verify headers
      expect(text).toContain('"ID","Date","Status","Form Name","Sender Name","Sender Email","Subject","Message","Page Path","Metadata"');
      // Verify formula prefixing
      expect(text).toContain('"\'=DangerousFormula"');
      expect(text).toContain('"\' +SUM(1+1)"'.replace(/ \+/, '+'));
      expect(text).toContain('"Safe message here"');
    });
  });
});

describe('Submissions Inbox Page (Submissions.tsx)', () => {
  let apiFetchSpy: any;
  let queryClient: QueryClient;

  const mockSubmissionsList: FormSubmission[] = [
    {
      id: 101,
      form_name: 'contact',
      page_path: '/contact',
      sender_name: 'Alice Johnson',
      sender_email: 'alice@example.com',
      subject: 'Inquiry about pricing',
      message: 'Can you provide a price sheet for enterprise plans?',
      metadata_json: JSON.stringify({ budget: '$10k+' }),
      status: 'unread',
      created_at: '2026-10-20T08:30:00Z',
    },
    {
      id: 102,
      form_name: 'newsletter',
      page_path: '/',
      sender_name: 'Bob Smith',
      sender_email: 'bob@example.com',
      subject: null,
      message: 'Newsletter signup request',
      metadata_json: null,
      status: 'read',
      created_at: '2026-10-19T14:15:00Z',
    },
    {
      id: 103,
      form_name: 'contact',
      page_path: '/support',
      sender_name: 'Charlie Brown',
      sender_email: 'charlie@example.com',
      subject: 'Archived feedback',
      message: 'Old feedback message.',
      metadata_json: null,
      status: 'archived',
      created_at: '2026-10-18T11:00:00Z',
    },
  ];

  const mockStats = {
    total_count: 3,
    unread_count: 1,
    read_count: 1,
    archived_count: 1,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    apiFetchSpy = vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (path, options) => {
      const urlStr = String(path);

      if (urlStr.includes('/api/submissions/stats')) {
        return new Response(JSON.stringify(mockStats), { status: 200 });
      }

      if (urlStr.includes('/api/submissions?') || urlStr.endsWith('/api/submissions')) {
        const urlObj = new URL(urlStr, 'http://localhost');
        const statusParam = urlObj.searchParams.get('status');
        const qParam = urlObj.searchParams.get('q');

        let filtered = [...mockSubmissionsList];
        if (statusParam && statusParam !== 'all') {
          filtered = filtered.filter((s) => s.status === statusParam);
        }
        if (qParam) {
          const lower = qParam.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.sender_name?.toLowerCase().includes(lower) ||
              s.sender_email.toLowerCase().includes(lower) ||
              s.message.toLowerCase().includes(lower) ||
              s.subject?.toLowerCase().includes(lower)
          );
        }

        return new Response(
          JSON.stringify({
            items: filtered,
            total: filtered.length,
            page: 1,
            per_page: 20,
          }),
          { status: 200 }
        );
      }

      if (options?.method === 'PUT') {
        const body = JSON.parse(String(options.body));
        return new Response(
          JSON.stringify({ id: 101, ...body }),
          { status: 200 }
        );
      }

      if (options?.method === 'DELETE') {
        return new Response(JSON.stringify({ success: true, id: 101 }), { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <WebMCPProvider>
            <Submissions />
          </WebMCPProvider>
        </Theme>
      </QueryClientProvider>
    );
  };

  it('renders table with submissions and stats badges', async () => {
    renderComponent();

    // Verify header and unread count badge
    expect(await screen.findByText('Submissions Inbox')).toBeInTheDocument();
    expect(await screen.findByText('1 unread')).toBeInTheDocument();

    // Verify table rows
    expect(await screen.findByTestId('submission-row-101')).toBeInTheDocument();
    expect(screen.getByTestId('submission-row-102')).toBeInTheDocument();
    expect(screen.getByTestId('submission-row-103')).toBeInTheDocument();

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Inquiry about pricing')).toBeInTheDocument();
  });

  it('filters submissions when clicking status tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await screen.findByTestId('submission-row-101');

    // Click Unread tab
    const unreadTab = screen.getByTestId('submissions-tab-unread');
    await user.click(unreadTab);

    await waitFor(() => {
      expect(screen.getByTestId('submission-row-101')).toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-102')).not.toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-103')).not.toBeInTheDocument();
    });

    // Click Archived tab
    const archivedTab = screen.getByTestId('submissions-tab-archived');
    await user.click(archivedTab);

    await waitFor(() => {
      expect(screen.getByTestId('submission-row-103')).toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-101')).not.toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-102')).not.toBeInTheDocument();
    });
  });

  it('filters submissions by search query', async () => {
    renderComponent();

    await screen.findByTestId('submission-row-101');

    const searchInput = screen.getByTestId('submissions-search-input');
    fireEvent.change(searchInput, { target: { value: 'pricing' } });

    await waitFor(() => {
      expect(screen.getByTestId('submission-row-101')).toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-102')).not.toBeInTheDocument();
      expect(screen.queryByTestId('submission-row-103')).not.toBeInTheDocument();
    });
  });

  it('toggles read/unread status on row action button click', async () => {
    const user = userEvent.setup();
    renderComponent();

    await screen.findByTestId('submission-row-101');

    // Row 101 is unread -> click Mark as read
    const markReadBtn = screen.getByTestId('submission-toggle-read-101');
    await user.click(markReadBtn);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/submissions/101',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'read' }),
        })
      );
    });
  });

  it('handles submission deletion on confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderComponent();

    await screen.findByTestId('submission-row-101');

    const deleteBtn = screen.getByTestId('submission-delete-101');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/submissions/101',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('opens detail dialog on row click and displays submission details', async () => {
    const user = userEvent.setup();
    renderComponent();

    const row = await screen.findByTestId('submission-row-101');
    await user.click(row);

    // Detail modal opens
    const modal = await screen.findByTestId('submission-detail-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Can you provide a price sheet for enterprise plans?')).toBeInTheDocument();
    expect(within(modal).getByText('alice@example.com')).toBeInTheDocument();
    expect(within(modal).getByText('$10k+')).toBeInTheDocument();

    // Opening unread automatically triggers mark as read mutation
    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/api/submissions/101',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'read' }),
      })
    );
  });
});
