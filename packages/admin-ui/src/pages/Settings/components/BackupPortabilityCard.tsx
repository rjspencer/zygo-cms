import React, { useState, useRef } from 'react';
import {
  Card,
  Heading,
  Text,
  Button,
  Flex,
  Box,
  Separator,
  Callout,
  Dialog,
  Grid,
  Badge,
} from '@radix-ui/themes';
import {
  DownloadIcon,
  UploadIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { apiFetch } from '../../../utils/api';

interface DryRunResponse {
  counts?: {
    settings?: number;
    menus?: number;
    section_templates?: number;
    layout_templates?: number;
    entries?: number;
    redirects?: number;
  };
  settings?: number;
  menus?: number;
  section_templates?: number;
  layout_templates?: number;
  entries?: number;
  redirects?: number;
  warnings?: string[];
  [key: string]: any;
}

export const BackupPortabilityCard: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stagedBackup, setStagedBackup] = useState<Record<string, any> | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResponse | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const res = await apiFetch('/api/admin/export');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server responded with status ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `zygo-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?(?:"([^"]+)"|([^;\s]+))/i);
        if (match) {
          filename = (match[1] || match[2] || '').trim();
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExportSuccess(`Site backup exported successfully (${filename}).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExportError(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setDialogError(null);
    setIsDryRunning(true);

    let parsed: any;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setImportError('Invalid backup file: Not valid JSON format.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsDryRunning(false);
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      setImportError('Invalid backup file: Root structure must be an object.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsDryRunning(false);
      return;
    }

    try {
      const res = await apiFetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup: parsed,
          dry_run: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned status ${res.status}`);
      }

      const dryRunData: DryRunResponse = await res.json();
      setDryRunResult(dryRunData);
      setStagedBackup(parsed);
      setIsDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Dry-run validation failed: ${msg}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleCancelDialog = () => {
    setIsDialogOpen(false);
    setStagedBackup(null);
    setDryRunResult(null);
    setDialogError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!stagedBackup) return;

    setIsImporting(true);
    setDialogError(null);

    try {
      const res = await apiFetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup: stagedBackup,
          dry_run: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server responded with status ${res.status}`);
      }

      setIsDialogOpen(false);
      setStagedBackup(null);
      setDryRunResult(null);
      setImportSuccess('Site backup restored successfully. Cached pages will refresh shortly.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDialogError(`Import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const settingsCount =
    dryRunResult?.counts?.settings ??
    dryRunResult?.settings ??
    (stagedBackup?.settings ? (typeof stagedBackup.settings === 'object' ? Object.keys(stagedBackup.settings).length : 1) : 0);

  const menusCount =
    dryRunResult?.counts?.menus ??
    dryRunResult?.menus ??
    (Array.isArray(stagedBackup?.menus) ? stagedBackup.menus.length : 0);

  const sectionTemplatesCount =
    dryRunResult?.counts?.section_templates ??
    dryRunResult?.section_templates ??
    (Array.isArray(stagedBackup?.section_templates) ? stagedBackup.section_templates.length : 0);

  const layoutTemplatesCount =
    dryRunResult?.counts?.layout_templates ??
    dryRunResult?.layout_templates ??
    (Array.isArray(stagedBackup?.layout_templates) ? stagedBackup.layout_templates.length : 0);

  const entriesCount =
    dryRunResult?.counts?.entries ??
    dryRunResult?.entries ??
    (Array.isArray(stagedBackup?.entries) ? stagedBackup.entries.length : 0);

  const redirectsCount =
    dryRunResult?.counts?.redirects ??
    dryRunResult?.redirects ??
    (Array.isArray(stagedBackup?.redirects) ? stagedBackup.redirects.length : 0);

  const warnings = Array.isArray(dryRunResult?.warnings) ? dryRunResult.warnings : [];

  return (
    <Card size="2" data-testid="backup-portability-card">
      <Heading size="3" mb="1">
        Backup &amp; Portability
      </Heading>
      <Text size="2" color="gray" mb="3">
        Export your complete site data to a portable JSON backup, or restore from a previously exported archive.
      </Text>

      <Separator size="4" mb="3" />

      <Flex direction="column" gap="4">
        {/* Export Section */}
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Box style={{ flex: 1, minWidth: '240px' }}>
            <Text size="2" weight="bold" as="div" mb="1">
              Export Site Data
            </Text>
            <Text size="2" color="gray">
              Download a full portable snapshot of settings, templates, menus, entries, and redirects.
            </Text>
          </Box>
          <Button
            type="button"
            variant="surface"
            data-testid="export-backup-btn"
            aria-label="Export site backup archive"
            onClick={handleExport}
            loading={isExporting}
            disabled={isExporting}
          >
            <DownloadIcon /> Export Site Data
          </Button>
        </Flex>

        {exportSuccess && (
          <Callout.Root color="green" size="1" role="status">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>{exportSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {exportError && (
          <Callout.Root color="red" size="1" role="alert">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{exportError}</Callout.Text>
          </Callout.Root>
        )}

        <Separator size="4" />

        {/* Import Section */}
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Box style={{ flex: 1, minWidth: '240px' }}>
            <Text size="2" weight="bold" as="div" mb="1">
              Restore from Backup
            </Text>
            <Text size="2" color="gray">
              Upload a previously exported backup archive to restore or migrate your site content.
            </Text>
          </Box>
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              data-testid="import-backup-file-input"
              aria-label="Upload site backup JSON file"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="soft"
              onClick={() => fileInputRef.current?.click()}
              loading={isDryRunning}
              disabled={isDryRunning}
              aria-label="Upload Backup File"
            >
              <UploadIcon /> Upload Backup File
            </Button>
          </Box>
        </Flex>

        {importSuccess && (
          <Callout.Root color="green" size="1" role="status">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>{importSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {importError && (
          <Callout.Root color="red" size="1" role="alert" data-testid="backup-error-callout">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{importError}</Callout.Text>
          </Callout.Root>
        )}
      </Flex>

      {/* Dry Run Confirmation Dialog */}
      <Dialog.Root
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isImporting) {
            handleCancelDialog();
          }
        }}
      >
        <Dialog.Content
          maxWidth="520px"
          data-testid="import-dry-run-dialog"
          aria-label="Backup import preview and confirmation"
        >
          <Dialog.Title>Restore Site Backup</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Review the items that will be restored from this archive. Restoring will upsert these resources
            into your database and purge the edge cache.
          </Dialog.Description>

          <Box mb="4">
            <Text size="2" weight="bold" as="div" mb="2">
              Archive Contents Summary
            </Text>
            <Grid columns="2" gap="2">
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Settings
                </Text>
                <Badge color="blue">{settingsCount}</Badge>
              </Flex>
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Menus
                </Text>
                <Badge color="blue">{menusCount}</Badge>
              </Flex>
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Section Templates
                </Text>
                <Badge color="blue">{sectionTemplatesCount}</Badge>
              </Flex>
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Layout Templates
                </Text>
                <Badge color="blue">{layoutTemplatesCount}</Badge>
              </Flex>
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Entries
                </Text>
                <Badge color="blue">{entriesCount}</Badge>
              </Flex>
              <Flex
                justify="between"
                align="center"
                p="2"
                style={{ backgroundColor: 'var(--gray-a2)', borderRadius: 'var(--radius-2)' }}
              >
                <Text size="2" color="gray">
                  Redirects
                </Text>
                <Badge color="blue">{redirectsCount}</Badge>
              </Flex>
            </Grid>
          </Box>

          {warnings.length > 0 && (
            <Callout.Root color="amber" size="1" mb="4" role="status">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                <Box>
                  <Text weight="bold" as="div" mb="1">
                    Warnings:
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {warnings.map((w, idx) => (
                      <li key={idx}>
                        <Text size="1">{w}</Text>
                      </li>
                    ))}
                  </ul>
                </Box>
              </Callout.Text>
            </Callout.Root>
          )}

          {dialogError && (
            <Callout.Root color="red" size="1" mb="4" role="alert">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{dialogError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" justify="end" mt="4">
            <Dialog.Close>
              <Button
                type="button"
                variant="soft"
                color="gray"
                disabled={isImporting}
                onClick={handleCancelDialog}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant="solid"
              color="red"
              data-testid="confirm-import-btn"
              aria-label="Confirm and execute site import"
              loading={isImporting}
              disabled={isImporting}
              onClick={handleConfirmImport}
            >
              Confirm &amp; Restore
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
};
