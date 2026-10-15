import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Flex,
  Text,
  Badge,
  Switch,
  Tooltip,
  IconButton,
} from '@radix-ui/themes';
import {
  Pencil1Icon,
  TrashIcon,
  LockClosedIcon,
  LockOpen1Icon,
} from '@radix-ui/react-icons';
import type { TemplateItem } from '../types';

interface TemplatesTableProps {
  templates: TemplateItem[];
  isAdmin: boolean;
  isDesigner: boolean;
  isLoading: boolean;
  isTogglingLock: boolean;
  isDeleting: boolean;
  onToggleLock: (template: TemplateItem, isLocked: boolean) => void;
  onDelete: (id: string) => void;
}

export const TemplatesTable: React.FC<TemplatesTableProps> = ({
  templates,
  isAdmin,
  isDesigner,
  isLoading,
  isTogglingLock,
  isDeleting,
  onToggleLock,
  onDelete,
}) => {
  const navigate = useNavigate();

  const lockedTooltipText =
    'This core template is locked. Please reach out to an admin if you need to make a change.';

  return (
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
        ) : templates.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={isAdmin ? 5 : 4}>
              <Text color="gray">No templates found.</Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          templates.map((template) => {
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
                        disabled={isTogglingLock}
                        onCheckedChange={(checked) => onToggleLock(template, checked)}
                        aria-label={`Toggle lock for ${template.name}`}
                      />
                      <Text size="1" color={isLocked ? 'amber' : 'gray'}>
                        {isLocked ? 'Locked' : 'Unlocked'}
                      </Text>
                    </Flex>
                  </Table.Cell>
                )}

                <Table.Cell style={{ textAlign: 'right' }}>
                  <Flex justify="end" align="center" gap="1">
                    {/* Edit Button */}
                    {isDesigner && isLocked ? (
                      <Tooltip content={lockedTooltipText}>
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            style={{ cursor: 'pointer' }}
                            size="2"
                            variant="ghost"
                            color="gray"
                            disabled={true}
                            aria-label={`Edit ${template.name}`}
                            title="Edit"
                          >
                            <Pencil1Icon width="18" height="18" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <IconButton
                        style={{ cursor: 'pointer' }}
                        size="2"
                        variant="ghost"
                        color="gray"
                        aria-label={`Edit ${template.name}`}
                        title="Edit"
                        onClick={() => navigate(`/templates/${template.id}`)}
                      >
                        <Pencil1Icon width="18" height="18" />
                      </IconButton>
                    )}

                    {/* Delete Button */}
                    {isDesigner && isLocked ? (
                      <Tooltip content={lockedTooltipText}>
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            style={{ cursor: 'pointer' }}
                            size="2"
                            variant="ghost"
                            color="red"
                            disabled={true}
                            aria-label={`Delete ${template.name}`}
                            title="Delete"
                          >
                            <TrashIcon width="18" height="18" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <IconButton
                        style={{ cursor: 'pointer' }}
                        size="2"
                        variant="ghost"
                        color="red"
                        aria-label={`Delete ${template.name}`}
                        title="Delete"
                        disabled={isDeleting}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete template "${template.name}"?`
                            )
                          ) {
                            onDelete(template.id);
                          }
                        }}
                      >
                        <TrashIcon width="18" height="18" />
                      </IconButton>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            );
          })
        )}
      </Table.Body>
    </Table.Root>
  );
};
