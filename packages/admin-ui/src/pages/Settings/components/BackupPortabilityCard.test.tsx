import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
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
    section_templates: 0,
    layout_templates: 0,
    entries: 2,
    redirects: 1,
  },
  warnings: ['Duplicate slug resolved'],
};

const sampleRestoreResponse = {
  success: true,
  dry_run: false,
  counts: {
    settings: 1,
    menus: 2,
    section_templates: 0,
    layout_templates: 0,
    entries: 2,
    redirects: 1,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title "Backup & Portability", description, and section headers', () => {
    renderCard();

    const heading = screen.getByRole('heading', { name: 'Backup & Portability' });
    expect(heading.textContent).toBe('Backup & Portability');

    const description = screen.getByText(
      /Export your complete site data to a portable JSON backup, or restore from a previously exported archive\./i
    );
    expect(description.textContent).toContain('Export your complete site data to a portable JSON backup');

    expect(
      screen.getByText('Download a full portable snapshot of settings, templates, menus, entries, and redirects.').textContent
    ).toContain('Download a full portable snapshot');
    expect(
      screen.getByText('Upload a previously exported backup archive to restore or migrate your site content.').textContent
    ).toContain('Upload a previously exported backup archive');
    expect(screen.getByText('Restore from Backup').textContent).toBe('Restore from Backup');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders export and upload buttons with accessible labels and attributes', () => {
    renderCard();

    const exportBtn = screen.getByRole('button', { name: 'Export site backup archive' });
    expect(exportBtn.hasAttribute('disabled')).toBe(false);

    const uploadBtn = screen.getByRole('button', { name: 'Upload Backup File' });
    expect(uploadBtn.hasAttribute('disabled')).toBe(false);

    const fileInput = screen.getByLabelText('Upload site backup JSON file');
    expect(fileInput.getAttribute('type')).toBe('file');
    expect(fileInput.getAttribute('accept')).toBe('.json,application/json');
  });

  it('clicking export calls /api/admin/export and initiates file download', async () => {
    const user = userEvent.setup();
    renderCard();

    const exportBtn = screen.getByRole('button', { name: 'Export site backup archive' });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith('/api/admin/export');
    });

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);

    const successCallout = await screen.findByRole('status');
    expect(successCallout.textContent).toContain('Site backup exported successfully (zygo-backup-2026-10-23.json).');
  });

  it('handles export error gracefully and displays error alert', async () => {
    const user = userEvent.setup();
    apiFetchSpy.mockImplementationOnce(async () => new Response('Export failed due to storage lock', { status: 500 }));

    renderCard();

    const exportBtn = screen.getByRole('button', { name: 'Export site backup archive' });
    await user.click(exportBtn);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Export failed: Export failed due to storage lock');
  });

  it('selecting a valid JSON backup file triggers dry-run request POST /api/admin/import with dry_run: true', async () => {
    const user = userEvent.setup();
    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/admin/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            backup: sampleBackupData,
            dry_run: true,
          }),
        })
      );
    });

    // Cleanly cancel and dismiss dialog to avoid Radix Presence teardown leaks
    const cancelBtn = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays the confirmation dialog with summary item counts and warnings', async () => {
    const user = userEvent.setup();
    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);

    const dialog = await screen.findByRole('dialog');
    const dialogTitle = screen.getByRole('heading', { name: 'Restore Site Backup' });
    expect(dialogTitle.textContent).toBe('Restore Site Backup');

    expect(screen.getByText('Settings').textContent).toBe('Settings');
    expect(screen.getByText('Menus').textContent).toBe('Menus');
    expect(screen.getByText('Section Templates').textContent).toBe('Section Templates');
    expect(screen.getByText('Layout Templates').textContent).toBe('Layout Templates');
    expect(screen.getByText('Entries').textContent).toBe('Entries');
    expect(screen.getByText('Redirects').textContent).toBe('Redirects');

    expect(dialog.textContent).toContain('Duplicate slug resolved');

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clicking "Confirm & Restore" triggers POST /api/admin/import with dry_run: false and shows success message', async () => {
    const user = userEvent.setup();
    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);

    await screen.findByRole('dialog');

    const confirmBtn = screen.getByRole('button', { name: 'Confirm and execute site import' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/admin/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            backup: sampleBackupData,
            dry_run: false,
          }),
        })
      );
    });

    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();

    const successCallout = await screen.findByRole('status');
    expect(successCallout.textContent).toContain(
      'Site backup restored successfully. Cached pages will refresh shortly.'
    );
  });

  it('shows error callout if uploading invalid non-JSON or malformed file', async () => {
    const user = userEvent.setup();
    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const badFile = new File(['this is definitely not json {{{'], 'broken-backup.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, badFile);

    const errorCallout = await screen.findByRole('alert');
    expect(errorCallout.textContent).toContain('Invalid backup file: Not valid JSON format.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows error callout if uploaded JSON root is not an object', async () => {
    const user = userEvent.setup();
    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const arrayFile = new File(['["array", "not", "object"]'], 'array-backup.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, arrayFile);

    const errorCallout = await screen.findByRole('alert');
    expect(errorCallout.textContent).toContain('Invalid backup file: Root structure must be an object.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays error callout when dry-run API returns an error response', async () => {
    const user = userEvent.setup();
    apiFetchSpy.mockImplementationOnce(async (path: string) => {
      if (path.includes('/api/admin/import')) {
        return new Response('Incompatible database schema version', { status: 400 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain('Dry-run validation failed: Incompatible database schema version');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays error message inside dialog when confirm import API returns an error', async () => {
    const user = userEvent.setup();
    apiFetchSpy.mockImplementation(async (path: string, options?: any) => {
      if (path.includes('/api/admin/import')) {
        const body = options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        if (body.dry_run === false) {
          return new Response('Database write transaction failed', { status: 500 });
        }
        return new Response(JSON.stringify(sampleDryRunResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    renderCard();

    const fileInput = screen.getByLabelText('Upload site backup JSON file') as HTMLInputElement;
    const file = new File([JSON.stringify(sampleBackupData)], 'zygo-backup-2026-10-23.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, file);

    await screen.findByRole('dialog');

    const confirmBtn = screen.getByRole('button', { name: 'Confirm and execute site import' });
    await user.click(confirmBtn);

    const dialogAlert = await screen.findByRole('alert');
    expect(dialogAlert.textContent).toContain('Import failed: Database write transaction failed');

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
