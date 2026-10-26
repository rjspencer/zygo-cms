import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  IconButton,
  TextField,
  Table,
  Badge,
  Card,
  Dialog,
  Callout,
} from '@radix-ui/themes';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CopyIcon,
  CheckIcon,
  InfoCircledIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../utils/api';
import { QRCodeDialog } from '../../components/QRCodeDialog';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import { createGlobalRedirectTools } from '../../lib/webmcp/redirectTools';
import {
  useRedirects,
  useCreateRedirect,
  useUpdateRedirect,
  useDeleteRedirect,
} from './hooks/useRedirects';
import { RedirectModal } from './components/RedirectModal';
import type { Redirect, CreateRedirectInput, UpdateRedirectInput } from './types';

export const Redirects: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deletingRedirect, setDeletingRedirect] = useState<Redirect | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Register WebMCP tools for Redirects
  const redirectTools = React.useMemo(() => createGlobalRedirectTools(), []);
  useRegisterWebMCPTools(redirectTools);

  // Fetch settings for canonical origin
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/settings');
        if (res.ok) return await res.json();
      } catch {
        // fallback to window.location.origin
      }
      return {};
    },
  });

  const origin =
    settings?.canonical_origin ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const getCanonicalSourceUrl = (sourcePath: string): string => {
    const cleanOrigin = origin.replace(/\/+$/, '');
    const cleanPath = sourcePath.startsWith('/') ? sourcePath : `/${sourcePath}`;
    return `${cleanOrigin}${cleanPath}`;
  };

  const {
    data: redirects = [],
    isLoading,
    error,
  } = useRedirects(search);

  const createMutation = useCreateRedirect();
  const updateMutation = useUpdateRedirect();
  const deleteMutation = useDeleteRedirect();

  useEffect(() => {
    if (!copiedPath) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') setCopiedPath(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedPath]);

  const handleCopy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
    } catch (err) {
      console.error('Failed to copy redirect path', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingRedirect(null);
    createMutation.reset();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (redirect: Redirect) => {
    setEditingRedirect(redirect);
    updateMutation.reset();
    setIsModalOpen(true);
  };

  const handleOpenDelete = (redirect: Redirect) => {
    setDeletingRedirect(redirect);
    deleteMutation.reset();
  };

  const handleModalSubmit = async (data: CreateRedirectInput | UpdateRedirectInput) => {
    if (editingRedirect) {
      await updateMutation.mutateAsync({
        id: editingRedirect.id,
        payload: data as UpdateRedirectInput,
      });
    } else {
      await createMutation.mutateAsync(data as CreateRedirectInput);
    }
    setIsModalOpen(false);
    setEditingRedirect(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRedirect) return;
    await deleteMutation.mutateAsync(deletingRedirect.id);
    setDeletingRedirect(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const saveError =
    (createMutation.error as Error)?.message ||
    (updateMutation.error as Error)?.message ||
    null;

  return (
    <Box p="4" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <Flex justify="between" align="start" mb="4" wrap="wrap" gap="3">
        <Box>
          <Heading size="6" weight="bold">
            Redirects &amp; Marketing URLs
          </Heading>
          <Text size="2" color="gray">
            Manage custom 301/302 redirects, SEO migration links, and vanity marketing URLs.
          </Text>
        </Box>
        <Button
          size="2"
          color="cyan"
          onClick={handleOpenCreate}
          data-testid="create-redirect-btn"
          aria-label="Create Redirect"
        >
          <PlusIcon width="16" height="16" /> Create Redirect
        </Button>
      </Flex>

      {/* Global Error Callout */}
      {error && (
        <Callout.Root color="red" size="2" mb="4" role="alert">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{(error as Error).message || 'Failed to load redirects'}</Callout.Text>
        </Callout.Root>
      )}

      {/* Main Content Card */}
      <Card size="2">
        {/* Search / Filter Input */}
        <Box mb="4">
          <TextField.Root
            id="redirect-search-input"
            data-testid="redirect-search-input"
            aria-label="Search redirects"
            placeholder="Search by path, target destination, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Table */}
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Source Path</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Target Destination</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status Code</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'center' }}>Hit Count</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  <Text color="gray">Loading redirects...</Text>
                </Table.Cell>
              </Table.Row>
            ) : redirects.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  <Text color="gray" data-testid="no-redirects-message">
                    {search ? 'No redirects match your search query.' : 'No redirects found. Create one to get started.'}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              redirects.map((redirect) => {
                const canonicalSourceUrl = getCanonicalSourceUrl(redirect.source_path);
                const isPermanent = redirect.status_code === 301;

                return (
                  <Table.Row key={redirect.id} data-testid={`redirect-row-${redirect.id}`}>
                    {/* Source Path */}
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        <Text weight="medium">
                          <code>{redirect.source_path}</code>
                        </Text>
                        <IconButton
                          size="1"
                          variant="ghost"
                          aria-label={`Copy source path ${redirect.source_path}`}
                          data-testid={`copy-source-btn-${redirect.id}`}
                          onClick={() => handleCopy(redirect.source_path)}
                        >
                          {copiedPath === redirect.source_path ? (
                            <CheckIcon color="green" />
                          ) : (
                            <CopyIcon />
                          )}
                        </IconButton>
                      </Flex>
                    </Table.Cell>

                    {/* Target Destination */}
                    <Table.Cell>
                      <Text color="gray">
                        <code>{redirect.target_url}</code>
                      </Text>
                    </Table.Cell>

                    {/* Status Code */}
                    <Table.Cell>
                      <Badge
                        color={isPermanent ? 'cyan' : 'orange'}
                        data-testid={`redirect-status-badge-${redirect.id}`}
                      >
                        {redirect.status_code} {isPermanent ? 'Permanent' : 'Temporary'}
                      </Badge>
                    </Table.Cell>

                    {/* Notes */}
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {redirect.notes || '—'}
                      </Text>
                    </Table.Cell>

                    {/* Hit Count */}
                    <Table.Cell style={{ textAlign: 'center' }}>
                      <Text size="2" weight="medium" data-testid={`redirect-hits-${redirect.id}`}>
                        {redirect.hit_count ?? 0}
                      </Text>
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell style={{ textAlign: 'right' }}>
                      <Flex justify="end" align="center" gap="2">
                        {/* QR Code Dialog Trigger */}
                        <QRCodeDialog
                          url={canonicalSourceUrl}
                          trigger={
                            <Button
                              size="1"
                              variant="soft"
                              aria-label={`View QR code for ${redirect.source_path}`}
                              data-testid={`redirect-qr-btn-${redirect.id}`}
                            >
                              QR Code
                            </Button>
                          }
                        />

                        {/* Edit Button */}
                        <IconButton
                          style={{ cursor: 'pointer' }}
                          size="2"
                          variant="ghost"
                          color="gray"
                          title="Edit Redirect"
                          aria-label={`Edit redirect ${redirect.source_path}`}
                          data-testid={`edit-redirect-btn-${redirect.id}`}
                          onClick={() => handleOpenEdit(redirect)}
                        >
                          <Pencil1Icon width="18" height="18" />
                        </IconButton>

                        {/* Delete Button */}
                        <IconButton
                          style={{ cursor: 'pointer' }}
                          size="2"
                          variant="ghost"
                          color="red"
                          title="Delete Redirect"
                          aria-label={`Delete redirect ${redirect.source_path}`}
                          data-testid={`delete-redirect-btn-${redirect.id}`}
                          onClick={() => handleOpenDelete(redirect)}
                        >
                          <TrashIcon width="18" height="18" />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table.Root>
      </Card>

      {/* Create / Edit Modal */}
      <RedirectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        redirect={editingRedirect}
        onSubmit={handleModalSubmit}
        isPending={isSaving}
        error={saveError}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={deletingRedirect !== null}
        onOpenChange={(open) => !open && setDeletingRedirect(null)}
      >
        <Dialog.Content maxWidth="450px">
          <Dialog.Title data-testid="delete-redirect-dialog-title">Delete Redirect</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Are you sure you want to delete the redirect for{' '}
            <code>{deletingRedirect?.source_path}</code>? Inbound requests to this path will no
            longer be redirected.
          </Dialog.Description>

          {deleteMutation.error && (
            <Callout.Root color="red" size="1" mb="3" role="alert">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                {(deleteMutation.error as Error).message || 'Failed to delete redirect'}
              </Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" justify="end">
            <Button
              variant="soft"
              color="gray"
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => setDeletingRedirect(null)}
              data-testid="cancel-delete-btn"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              color="red"
              type="button"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
              data-testid="confirm-delete-btn"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default Redirects;
