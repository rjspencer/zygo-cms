import '../../test/setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { server } from '../../test/mocks/server';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import { Redirects } from './Redirects';
import type { Redirect } from './types';

// Patch happy-dom's Request.prototype.body getter-only bug so MSW's request.clone() succeeds
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

const mockRedirects: Redirect[] = [
  {
    id: 1,
    source_path: '/old-about.html',
    target_url: '/about',
    status_code: 301,
    notes: 'Legacy SEO migration',
    hit_count: 1420,
    created_at: '2026-01-15 10:00:00',
    updated_at: '2026-01-15 10:00:00',
  },
  {
    id: 2,
    source_path: '/spring-sale',
    target_url: '/pricing?utm=spring',
    status_code: 302,
    notes: 'Spring campaign link',
    hit_count: 389,
    created_at: '2026-03-01 12:00:00',
    updated_at: '2026-03-01 12:00:00',
  },
];

const renderRedirects = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/redirects']}>
      <WebMCPProvider>
        <Theme>
          <QueryClientProvider client={queryClient}>
            <Redirects />
          </QueryClientProvider>
        </Theme>
      </WebMCPProvider>
    </MemoryRouter>
  );
};

describe('Redirects Page Component', () => {
  beforeEach(() => {
    server.resetHandlers();
    server.use(
      http.get('*/api/settings', () => {
        return HttpResponse.json({ canonical_origin: 'https://example.com' });
      }),
      http.get('*/api/redirects', () => {
        return HttpResponse.json(mockRedirects);
      })
    );
  });

  it('renders page title "Redirects & Marketing URLs" and loaded redirect rows', async () => {
    renderRedirects();

    expect(screen.getByRole('heading', { name: /Redirects & Marketing URLs/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('/old-about.html')).toBeInTheDocument();
      expect(screen.getByText('/about')).toBeInTheDocument();
      expect(screen.getByText('/spring-sale')).toBeInTheDocument();
      expect(screen.getByText('/pricing?utm=spring')).toBeInTheDocument();
    });

    expect(screen.getByText('301 Permanent')).toBeInTheDocument();
    expect(screen.getByText('302 Temporary')).toBeInTheDocument();

    // Verify all table column headers
    expect(screen.getByRole('columnheader', { name: 'Source Path' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Target Destination' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status Code' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hit Count' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('renders empty state when no redirects exist and when search returns no matches', async () => {
    server.use(
      http.get('*/api/redirects', () => {
        return HttpResponse.json([]);
      })
    );

    renderRedirects();

    await waitFor(() => {
      const emptyMessage = screen.getByTestId('no-redirects-message');
      expect(emptyMessage).toHaveTextContent('No redirects found. Create one to get started.');
    });
  });

  it('filters redirects using the search input and shows query empty state when nothing matches', async () => {
    renderRedirects();

    await waitFor(() => {
      expect(screen.getByText('/old-about.html')).toBeInTheDocument();
      expect(screen.getByText('/spring-sale')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('redirect-search-input');
    fireEvent.change(searchInput, { target: { value: 'spring' } });

    await waitFor(() => {
      expect(screen.queryByText('/old-about.html')).not.toBeInTheDocument();
      expect(screen.getByText('/spring-sale')).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'non-existent-path-xyz' } });

    await waitFor(() => {
      const emptyMessage = screen.getByTestId('no-redirects-message');
      expect(emptyMessage).toHaveTextContent('No redirects match your search query.');
    });
  });

  it('verifies the QR Code dialog trigger button exists with accessible aria-label and data-testid', async () => {
    renderRedirects();

    await waitFor(() => {
      expect(screen.getByTestId('redirect-qr-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('redirect-qr-btn-2')).toBeInTheDocument();
    });

    const qrBtn1 = screen.getByTestId('redirect-qr-btn-1');
    expect(qrBtn1).toHaveAttribute('aria-label', 'View QR code for /old-about.html');

    const qrBtn2 = screen.getByTestId('redirect-qr-btn-2');
    expect(qrBtn2).toHaveAttribute('aria-label', 'View QR code for /spring-sale');
  });

  it('opens the Create Redirect modal, submits a new redirect, and verifies mock mutation is called', async () => {
    let postBody: any = null;

    server.use(
      http.post('*/api/redirects', async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({
          id: 3,
          source_path: postBody.source_path,
          target_url: postBody.target_url,
          status_code: postBody.status_code || 301,
          notes: postBody.notes || null,
          hit_count: 0,
          created_at: '2026-03-10 10:00:00',
          updated_at: '2026-03-10 10:00:00',
        });
      })
    );

    renderRedirects();

    await waitFor(() => {
      expect(screen.getByText('/old-about.html')).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId('create-redirect-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('redirect-modal-title')).toHaveTextContent('Create Redirect');
    });

    const sourceInput = screen.getByTestId('redirect-source-input');
    const targetInput = screen.getByTestId('redirect-target-input');
    const notesInput = screen.getByTestId('redirect-notes-input');

    fireEvent.change(sourceInput, { target: { value: '/summer-promo' } });
    fireEvent.change(targetInput, { target: { value: '/campaigns/summer' } });
    fireEvent.change(notesInput, { target: { value: 'Summer promotional banner link' } });

    expect((sourceInput as HTMLInputElement).value).toBe('/summer-promo');

    const saveBtn = screen.getByTestId('save-redirect-btn');
    const form = saveBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(postBody).toEqual({
        source_path: '/summer-promo',
        target_url: '/campaigns/summer',
        status_code: 301,
        notes: 'Summer promotional banner link',
      });
    });
  });

  it('validates against self-redirect loops in RedirectModal', async () => {
    renderRedirects();

    await waitFor(() => {
      expect(screen.getByText('/old-about.html')).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId('create-redirect-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('redirect-modal-title')).toHaveTextContent('Create Redirect');
    });

    const sourceInput = screen.getByTestId('redirect-source-input');
    const targetInput = screen.getByTestId('redirect-target-input');

    // Enter identical source and target paths
    fireEvent.change(sourceInput, { target: { value: '/products' } });
    fireEvent.change(targetInput, { target: { value: '/products' } });

    const saveBtn = screen.getByTestId('save-redirect-btn');
    const form = saveBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('redirect-modal-error')).toHaveTextContent(
        'Source path and target destination cannot be identical (self-redirect).'
      );
    });
  });

  it('opens Edit modal with prefilled data and submits updates via PUT', async () => {
    let putBody: any = null;
    let putId: string | null = null;

    server.use(
      http.put('*/api/redirects/:id', async ({ params, request }) => {
        putId = String(params.id);
        putBody = await request.json();
        return HttpResponse.json({
          id: Number(putId),
          ...putBody,
          hit_count: 1420,
          created_at: '2026-01-15 10:00:00',
          updated_at: '2026-03-12 11:00:00',
        });
      })
    );

    renderRedirects();

    await waitFor(() => {
      expect(screen.getByTestId('edit-redirect-btn-1')).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId('edit-redirect-btn-1');
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByTestId('redirect-modal-title')).toHaveTextContent('Edit Redirect');
    });

    const sourceInput = screen.getByTestId('redirect-source-input') as HTMLInputElement;
    const targetInput = screen.getByTestId('redirect-target-input') as HTMLInputElement;
    const notesInput = screen.getByTestId('redirect-notes-input') as HTMLTextAreaElement;

    // Verify existing data is populated
    expect(sourceInput.value).toBe('/old-about.html');
    expect(targetInput.value).toBe('/about');
    expect(notesInput.value).toBe('Legacy SEO migration');

    // Update target destination
    fireEvent.change(targetInput, { target: { value: '/about-us' } });

    const saveBtn = screen.getByTestId('save-redirect-btn');
    const form = saveBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(putId).toBe('1');
      expect(putBody).toEqual({
        source_path: '/old-about.html',
        target_url: '/about-us',
        status_code: 301,
        notes: 'Legacy SEO migration',
      });
    });
  });

  it('triggers delete confirmation and verifies deletion', async () => {
    let deletedId: string | null = null;

    server.use(
      http.delete('*/api/redirects/:id', ({ params }) => {
        deletedId = String(params.id);
        return HttpResponse.json({ success: true });
      })
    );

    renderRedirects();

    await waitFor(() => {
      expect(screen.getByTestId('delete-redirect-btn-1')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-redirect-btn-1');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('delete-redirect-dialog-title')).toHaveTextContent('Delete Redirect');
    });

    const confirmBtn = screen.getByTestId('confirm-delete-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deletedId).toBe('1');
    });
  });
});
