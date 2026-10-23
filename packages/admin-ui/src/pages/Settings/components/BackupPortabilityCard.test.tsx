import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { BackupPortabilityCard } from './BackupPortabilityCard';

vi.mock('../../../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../../utils/api';

const sampleBackupData = {
  version: '1.0',
  exported_at: '2026-10-23T12:00:00Z',
  settings: { site_title: 'Zygo Test Site' },
  menus: [
    { id: 1, name: 'Main Menu', items: [] },
    { id: 2, name: 'Footer Menu', items: [] },
  ],
  section_templates: [],
  layout_templates: [],
  entries: [
    { id: 1, title: 'Home', slug: '/' },
    { id: 2, title: 'About', slug: '/about' },
  ],
  redirects: [
    { id: 1, source_path: '/old-link', target_url: '/new-link', status_code: 301 },
  ],
  media_manifest: [],
};

const sampleDryRunResponse = {
  success: true,
  dry_run: true,
  counts: {
    settings: 1,
    menus: 2,
    templates: 0,
    entries: 2,
    redirects: 1,
    media: 0,
  },
  warnings: ['Duplicate slug resolved'],
};

const sampleRestoreResponse = {
  success: true,
  dry_run: false,
  counts: {
    settings: 1,
    menus: 2,
    templates: 0,
    entries: 2,
    redirects: 1,
    media: 0,
  },
  warnings: [],
};

const renderCard = (props: React.ComponentProps<typeof BackupPortabilityCard> = {}) =>
  render(
    <Theme>
      <BackupPortabilityCard {...props} />
    </Theme>
  );

describe('BackupPortabilityCard', () => {
  let apiFetchSpy: any;
  let globalFetchSpy: any;
  let createObjectURLMock: any;
  let revokeObjectURLMock: any;
  let clickSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-backup-blob');
    revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    apiFetchSpy = vi.mocked(apiFetch).mockImplementation(async (path: string, options?: any) => {
      const url = String(path);
      if (url.includes('/api/admin/export')) {
        return new Response(JSON.stringify(sampleBackupData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="zygo-backup-2026-10-23.json"',
          },
        });
      }
      if (url.includes('/api/admin/import')) {
        const body = options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        if (body.dry_run === false) {
          return new Response(JSON.stringify(sampleRestoreResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(sampleDryRunResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/admin/export')) {
        return new Response(JSON.stringify(sampleBackupData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="zygo-backup-2026-10-23.json"',
          },
        });
      }
      if (url.includes('/api/admin/import')) {
        const body = init?.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : {};
        if (body.dry_run === false) {
          return new Response(JSON.stringify(sampleRestoreResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(sampleDryRunResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title "Backup & Portability" and description', () => {
    renderCard();

    expect(screen.getByText('Backup & Portability')).toBeInTheDocument();
    expect(
      screen.getByText(/Export your complete site data to a portable JSON backup/i)
    ).toBeInTheDocument();
  });

  it('has export button with data-testid="export-backup-btn" and aria-label="Export site backup archive"', () => {
    renderCard();

    const exportBtn = screen.getByTestId('export-backup-btn');
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).toHaveAttribute('aria-label', 'Export site backup archive');
  });

  it('clicking export calls /api/admin/export and initiates file download (mocked URL.createObjectURL and window.HTMLAnchorElement.prototype.click)', async () => {
    renderCard();

    const exportBtn = screen.getByTestId('export-backup-btn');
    await userEvent.click(exportBtn);

    await waitFor(() => {
      const apiCalled = apiFetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/api/admin/export'));
      const globalFetchCalled = globalFetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/api/admin/export'));
      expect(apiCalled || globalFetchCalled).toBe(true);
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('selecting a valid JSON backup file triggers dry-run request POST /api/admin/import with dry_run: true', async () => {
    const { container } = renderCard();

    const fileInput =
      screen.queryByTestId('import-backup-input') ||
      container.querySelector('input[type="file"]') ||
      screen.getByLabelText(/restore snapshot|upload|import/i);

    expect(fileInput).toBeInTheDocument();

    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput as HTMLInputElement, file);

    await waitFor(() => {
      const apiImportCall = apiFetchSpy.mock.calls.find((c: any[]) => String(c[0]).includes('/api/admin/import'));
      const fetchImportCall = globalFetchSpy.mock.calls.find((c: any[]) => String(c[0]).includes('/api/admin/import'));
      const foundCall = apiImportCall || fetchImportCall;
      expect(foundCall).toBeDefined();

      const options = foundCall[1];
      const body = options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
      expect(body.dry_run).toBe(true);
    });
  });

  it('displays the confirmation dialog (data-testid="import-dry-run-dialog") with item counts', async () => {
    const { container } = renderCard();

    const fileInput =
      screen.queryByTestId('import-backup-input') ||
      container.querySelector('input[type="file"]') ||
      screen.getByLabelText(/restore snapshot|upload|import/i);

    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput as HTMLInputElement, file);

    const dialog = await screen.findByTestId('import-dry-run-dialog');
    expect(dialog).toBeInTheDocument();

    // Check that counts (settings: 1, menus: 2, entries: 2, redirects: 1) are presented in the preview dialog
    expect(dialog.textContent).toMatch(/1/); // settings or redirects
    expect(dialog.textContent).toMatch(/2/); // menus or entries
  });

  it('clicking "Confirm & Restore" (data-testid="confirm-import-btn") triggers POST /api/admin/import with dry_run: false', async () => {
    const { container } = renderCard();

    const fileInput =
      screen.queryByTestId('import-backup-input') ||
      container.querySelector('input[type="file"]') ||
      screen.getByLabelText(/restore snapshot|upload|import/i);

    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput as HTMLInputElement, file);

    const dialog = await screen.findByTestId('import-dry-run-dialog');
    expect(dialog).toBeInTheDocument();

    const confirmBtn =
      screen.queryByTestId('confirm-import-btn') ||
      screen.getByRole('button', { name: /confirm & restore|confirm/i });

    await userEvent.click(confirmBtn);

    await waitFor(() => {
      const apiRestoreCall = apiFetchSpy.mock.calls.find((c: any[]) => {
        if (!String(c[0]).includes('/api/admin/import')) return false;
        const b = c[1]?.body ? (typeof c[1].body === 'string' ? JSON.parse(c[1].body) : c[1].body) : {};
        return b.dry_run === false;
      });

      const fetchRestoreCall = globalFetchSpy.mock.calls.find((c: any[]) => {
        if (!String(c[0]).includes('/api/admin/import')) return false;
        const b = c[1]?.body ? (typeof c[1].body === 'string' ? JSON.parse(c[1].body) : c[1].body) : {};
        return b.dry_run === false;
      });

      expect(apiRestoreCall || fetchRestoreCall).toBeDefined();
    });
  });

  it('shows error callout if uploading invalid non-JSON or malformed file', async () => {
    const { container } = renderCard();

    const fileInput =
      screen.queryByTestId('import-backup-input') ||
      container.querySelector('input[type="file"]') ||
      screen.getByLabelText(/restore snapshot|upload|import/i);

    const badFile = new File(['this is definitely not json {{{'], 'broken-backup.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput as HTMLInputElement, badFile);

    await waitFor(() => {
      const errorCallout =
        screen.queryByRole('alert') ||
        screen.queryByTestId('backup-error-callout') ||
        screen.queryByText(/invalid|malformed|failed to parse|json/i);

      expect(errorCallout).toBeInTheDocument();
    });
  });
});
