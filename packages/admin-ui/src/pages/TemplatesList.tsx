import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Table,
  Badge,
  Switch,
  Tooltip,
  TextField,
  Callout,
} from '@radix-ui/themes';
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  LockClosedIcon,
  LockOpen1Icon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { apiFetch } from '../utils/api';

export interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  schema_json: string;
  template_html?: string | null;
  template_css?: string | null;
  css_classes_json?: string;
  is_locked?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export const TemplatesList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch current user information and role
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  const role = meData?.role?.toLowerCase() || 'author';
  const isAdmin = role === 'admin';
  const isDesigner = role === 'designer';

  // Fetch all templates (content_types)
  const {
    data: templates = [],
    isLoading,
    error: fetchError,
  } = useQuery<TemplateItem[]>({
    queryKey: ['content-types'],
    queryFn: async () => {
      const res = await apiFetch('/api/content-types');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Admin lock toggle mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ template, isLocked }: { template: TemplateItem; isLocked: boolean }) => {
      setActionError(null);
      const res = await apiFetch(`/api/content-types/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description || '',
          schema_json: template.schema_json || '[]',
          template_html: template.template_html || '',
          template_css: template.template_css || '',
          is_locked: isLocked,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to update template lock status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update lock status');
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setActionError(null);
      const res = await apiFetch(`/api/content-types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to delete template');
    },
  });

  const filteredTemplates = templates.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term))
    );
  });

  const lockedTooltipText =
    'This core template is locked. Please reach out to an admin if you need to make a change.';

  return (
    <Box style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Templates
          </Heading>
          <Text size="2" color="gray">
            Manage section templates, schemas, and MiniJinja rendering layouts
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => navigate('/admin/templates/new')}>
          <PlusIcon width="16" height="16" />
          New Template
        </Button>
      </Flex>

      {actionError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      )}

      {fetchError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {fetchError instanceof Error ? fetchError.message : 'Error loading templates'}
          </Callout.Text>
        </Callout.Root>
      )}

      <Card size="2">
        <Box mb="4">
          <TextField.Root
            placeholder="Search templates by name, slug, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Box>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Template Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Identifier (Slug)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              {isAdmin && <Table.ColumnHeaderCell>Lock Control</Table.ColumnHeaderCell>}
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={isAdmin ? 5 : 4}>
                  <Text color="gray">Loading templates...</Text>
                </Table.Cell>
              </Table.Row>
            ) : filteredTemplates.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={isAdmin ? 5 : 4}>
                  <Text color="gray">No templates found.</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredTemplates.map((template) => {
                const isLocked = Boolean(template.is_locked);

                return (
                  <Table.Row key={template.id} align="center">
                    <Table.RowHeaderCell>
                      <Flex direction="column">
                        <Text weight="medium">{template.name}</Text>
                        {template.description && (
                          <Text size="1" color="gray">
                            {template.description}
                          </Text>
                        )}
                      </Flex>
                    </Table.RowHeaderCell>

                    <Table.Cell>
                      <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                        {template.id}
                      </Text>
                    </Table.Cell>

                    <Table.Cell>
                      <Badge color={isLocked ? 'amber' : 'gray'} variant="soft">
                        <Flex align="center" gap="1">
                          {isLocked ? (
                            <LockClosedIcon width="12" height="12" />
                          ) : (
                            <LockOpen1Icon width="12" height="12" />
                          )}
                          {isLocked ? 'Locked' : 'Unlocked'}
                        </Flex>
                      </Badge>
                    </Table.Cell>

                    {isAdmin && (
                      <Table.Cell>
                        <Flex align="center" gap="2">
                          <Switch
                            size="1"
                            checked={isLocked}
                            disabled={toggleLockMutation.isPending}
                            onCheckedChange={(checked) =>
                              toggleLockMutation.mutate({ template, isLocked: checked })
                            }
                            aria-label={`Toggle lock for ${template.name}`}
                          />
                          <Text size="1" color={isLocked ? 'amber' : 'gray'}>
                            {isLocked ? 'Locked' : 'Unlocked'}
                          </Text>
                        </Flex>
                      </Table.Cell>
                    )}

                    <Table.Cell style={{ textAlign: 'right' }}>
                      <Flex justify="end" align="center" gap="2">
                        {/* Edit Button */}
                        {isDesigner && isLocked ? (
                          <Tooltip content={lockedTooltipText}>
                            <span style={{ display: 'inline-flex' }}>
                              <Button
                                size="1"
                                variant="ghost"
                                color="gray"
                                disabled={true}
                                aria-label={`Edit ${template.name}`}
                                title="Edit"
                              >
                                <Pencil1Icon width="14" height="14" />
                                Edit
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Button
                            size="1"
                            variant="ghost"
                            color="gray"
                            aria-label={`Edit ${template.name}`}
                            title="Edit"
                            onClick={() => navigate(`/admin/templates/${template.id}`)}
                          >
                            <Pencil1Icon width="14" height="14" />
                            Edit
                          </Button>
                        )}

                        {/* Delete Button */}
                        {isDesigner && isLocked ? (
                          <Tooltip content={lockedTooltipText}>
                            <span style={{ display: 'inline-flex' }}>
                              <Button
                                size="1"
                                variant="ghost"
                                color="red"
                                disabled={true}
                                aria-label={`Delete ${template.name}`}
                                title="Delete"
                              >
                                <TrashIcon width="14" height="14" />
                                Delete
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Button
                            size="1"
                            variant="ghost"
                            color="red"
                            aria-label={`Delete ${template.name}`}
                            title="Delete"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete template "${template.name}"?`
                                )
                              ) {
                                deleteMutation.mutate(template.id);
                              }
                            }}
                          >
                            <TrashIcon width="14" height="14" />
                            Delete
                          </Button>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default TemplatesList;
