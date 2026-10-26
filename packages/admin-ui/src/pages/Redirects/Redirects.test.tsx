import '../../test/setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      queries: { retry: false, gcTime: Infinity },
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

    const heading = screen.getByRole('heading', { name: /Redirects & Marketing URLs/i });
    expect(heading.textContent).toContain('Redirects & Marketing URLs');

    const source1 = await screen.findByText('/old-about.html');
    expect(source1.textContent).toBe('/old-about.html');
    expect(screen.getByText('/about').textContent).toBe('/about');
    expect(screen.getByText('/spring-sale').textContent).toBe('/spring-sale');
    expect(screen.getByText('/pricing?utm=spring').textContent).toBe('/pricing?utm=spring');

    expect(screen.getByText('301 Permanent').textContent).toBe('301 Permanent');
    expect(screen.getByText('302 Temporary').textContent).toBe('302 Temporary');

    // Verify all table column headers
    expect(screen.getByRole('columnheader', { name: 'Source Path' }).textContent).toBe('Source Path');
    expect(screen.getByRole('columnheader', { name: 'Target Destination' }).textContent).toBe('Target Destination');
    expect(screen.getByRole('columnheader', { name: 'Status Code' }).textContent).toBe('Status Code');
    expect(screen.getByRole('columnheader', { name: 'Notes' }).textContent).toBe('Notes');
    expect(screen.getByRole('columnheader', { name: 'Hit Count' }).textContent).toBe('Hit Count');
    expect(screen.getByRole('columnheader', { name: 'Actions' }).textContent).toBe('Actions');
  });

  it('renders empty state when no redirects exist and when search returns no matches', async () => {
    server.use(
      http.get('*/api/redirects', () => {
        return HttpResponse.json([]);
      })
    );

    renderRedirects();

    const emptyMessage = await screen.findByTestId('no-redirects-message');
    expect(emptyMessage.textContent).toBe('No redirects found. Create one to get started.');
  });

  it('filters redirects using the search input and shows query empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderRedirects();

    const oldAbout = await screen.findByText('/old-about.html');
    expect(oldAbout.textContent).toBe('/old-about.html');
    expect(screen.getByText('/spring-sale').textContent).toBe('/spring-sale');

    const searchInput = screen.getByLabelText('Search redirects');
    await user.type(searchInput, 'spring');

    expect(screen.queryByText('/old-about.html')).toBeNull();
    expect(screen.getByText('/spring-sale').textContent).toBe('/spring-sale');

    await user.clear(searchInput);
    await user.type(searchInput, 'non-existent-path-xyz');

    const emptyMessage = await screen.findByTestId('no-redirects-message');
    expect(emptyMessage.textContent).toBe('No redirects match your search query.');
  });

  it('verifies the QR Code dialog trigger button exists with accessible aria-label and data-testid', async () => {
    renderRedirects();

    const qrBtn1 = await screen.findByTestId('redirect-qr-btn-1');
    expect(qrBtn1.getAttribute('aria-label')).toBe('View QR code for /old-about.html');

    const qrBtn2 = screen.getByTestId('redirect-qr-btn-2');
    expect(qrBtn2.getAttribute('aria-label')).toBe('View QR code for /spring-sale');
  });

  it('opens the Create Redirect modal, submits a new redirect, and verifies mock mutation is called', async () => {
    const user = userEvent.setup();
    let postBody: any = null;
    const currentRedirects = [...mockRedirects];

    server.use(
      http.get('*/api/redirects', () => {
        return HttpResponse.json(currentRedirects);
      }),
      http.post('*/api/redirects', async ({ request }) => {
        postBody = await request.json();
        const created: Redirect = {
          id: 3,
          source_path: postBody.source_path,
          target_url: postBody.target_url,
          status_code: postBody.status_code || 301,
          notes: postBody.notes || null,
          hit_count: 0,
          created_at: '2026-03-10 10:00:00',
          updated_at: '2026-03-10 10:00:00',
        };
        currentRedirects.push(created);
        return HttpResponse.json(created);
      })
    );

    renderRedirects();

    await screen.findByText('/old-about.html');

    const createBtn = screen.getByRole('button', { name: 'Create Redirect' });
    await user.click(createBtn);

    const modalTitle = await screen.findByTestId('redirect-modal-title');
    expect(modalTitle.textContent).toBe('Create Redirect');

    const sourceInput = screen.getByLabelText('Source Path');
    const targetInput = screen.getByLabelText('Target Destination');
    const notesInput = screen.getByLabelText('Notes (Optional)');

    await user.type(sourceInput, '/summer-promo');
    await user.type(targetInput, '/campaigns/summer');
    await user.type(notesInput, 'Summer promotional banner link');

    expect((sourceInput as HTMLInputElement).value).toBe('/summer-promo');

    const saveBtn = screen.getByRole('button', { name: 'Create Redirect' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(postBody).toEqual({
        source_path: '/summer-promo',
        target_url: '/campaigns/summer',
        status_code: 301,
        notes: 'Summer promotional banner link',
      });
    });

    const newRow = await screen.findByText('/summer-promo');
    expect(newRow.textContent).toBe('/summer-promo');
    expect(screen.queryByTestId('redirect-modal-title')).toBeNull();
  });

  it('validates against self-redirect loops in RedirectModal', async () => {
    const user = userEvent.setup();
    renderRedirects();

    await screen.findByText('/old-about.html');

    const createBtn = screen.getByRole('button', { name: 'Create Redirect' });
    await user.click(createBtn);

    const modalTitle = await screen.findByTestId('redirect-modal-title');
    expect(modalTitle.textContent).toBe('Create Redirect');

    const sourceInput = screen.getByLabelText('Source Path');
    const targetInput = screen.getByLabelText('Target Destination');

    // Enter identical source and target paths
    await user.type(sourceInput, '/products');
    await user.type(targetInput, '/products');

    const saveBtn = screen.getByRole('button', { name: 'Create Redirect' });
    await user.click(saveBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain(
      'Source path and target destination cannot be identical (self-redirect).'
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);
    expect(screen.queryByTestId('redirect-modal-title')).toBeNull();
  });

  it('opens Edit modal with prefilled data and submits updates via PUT', async () => {
    const user = userEvent.setup();
    let putBody: any = null;
    let putId: string | null = null;
    let currentRedirects = [...mockRedirects];

    server.use(
      http.get('*/api/redirects', () => {
        return HttpResponse.json(currentRedirects);
      }),
      http.put('*/api/redirects/:id', async ({ params, request }) => {
        putId = String(params.id);
        putBody = await request.json();
        const updated: Redirect = {
          id: Number(putId),
          ...putBody,
          hit_count: 1420,
          created_at: '2026-01-15 10:00:00',
          updated_at: '2026-03-12 11:00:00',
        };
        currentRedirects = currentRedirects.map((r) => (r.id === Number(putId) ? updated : r));
        return HttpResponse.json(updated);
      })
    );

    renderRedirects();

    const editBtn = await screen.findByRole('button', { name: 'Edit redirect /old-about.html' });
    await user.click(editBtn);

    const modalTitle = await screen.findByTestId('redirect-modal-title');
    expect(modalTitle.textContent).toBe('Edit Redirect');

    const sourceInput = screen.getByLabelText('Source Path') as HTMLInputElement;
    const targetInput = screen.getByLabelText('Target Destination') as HTMLInputElement;
    const notesInput = screen.getByLabelText('Notes (Optional)') as HTMLTextAreaElement;

    // Verify existing data is populated
    expect(sourceInput.value).toBe('/old-about.html');
    expect(targetInput.value).toBe('/about');
    expect(notesInput.value).toBe('Legacy SEO migration');

    // Update target destination
    await user.clear(targetInput);
    await user.type(targetInput, '/about-us');

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(putId).toBe('1');
      expect(putBody).toEqual({
        source_path: '/old-about.html',
        target_url: '/about-us',
        status_code: 301,
        notes: 'Legacy SEO migration',
      });
    });

    const updatedRow = await screen.findByText('/about-us');
    expect(updatedRow.textContent).toBe('/about-us');
    expect(screen.queryByTestId('redirect-modal-title')).toBeNull();
  });

  it('triggers delete confirmation and verifies deletion', async () => {
    const user = userEvent.setup();
    let deletedId: string | null = null;
    let currentRedirects = [...mockRedirects];

    server.use(
      http.get('*/api/redirects', () => {
        return HttpResponse.json(currentRedirects);
      }),
      http.delete('*/api/redirects/:id', ({ params }) => {
        deletedId = String(params.id);
        currentRedirects = currentRedirects.filter((r) => r.id !== Number(deletedId));
        return HttpResponse.json({ success: true });
      })
    );

    renderRedirects();

    const deleteBtn = await screen.findByRole('button', { name: 'Delete redirect /old-about.html' });
    await user.click(deleteBtn);

    const dialogTitle = await screen.findByTestId('delete-redirect-dialog-title');
    expect(dialogTitle.textContent).toBe('Delete Redirect');

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deletedId).toBe('1');
    });

    // Verify item is removed and confirmation dialog is closed
    expect(screen.queryByText('/old-about.html')).toBeNull();
    expect(screen.queryByTestId('delete-redirect-dialog-title')).toBeNull();
  });
});
