import React from 'react';
import { Table, Badge, Button, Flex, Text, Box } from '@radix-ui/themes';
import {
  Pencil1Icon,
  CopyIcon,
  TrashIcon,
  CheckCircledIcon,
  EyeOpenIcon,
} from '@radix-ui/react-icons';
import type { ThemesTableProps } from '../../types';
import { ThemeSwatches } from '../ThemeSwatches/ThemeSwatches';

export const ThemesTable: React.FC<ThemesTableProps> = ({
  themes,
  primaryThemeId,
  darkThemeId,
  onActivate,
  onRename,
  onDuplicate,
  onDelete,
  onEdit,
  isDuplicatingId,
}) => {
  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Theme Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Swatches</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {themes.map((theme) => {
            const isPrimary = theme.id === primaryThemeId;
            const isDark = theme.id === darkThemeId;
            const isActive = isPrimary || isDark;
            const isDuplicating = isDuplicatingId === theme.id;

            return (
              <Table.Row key={theme.id} align="center">
                <Table.RowHeaderCell>
                  <Text weight="bold">{theme.name}</Text>
                  <Text size="1" color="gray" as="div">
                    {theme.id}
                  </Text>
                </Table.RowHeaderCell>

                <Table.Cell>
                  <Text size="2" color="gray">
                    {theme.description || '—'}
                  </Text>
                </Table.Cell>

                <Table.Cell>
                  <ThemeSwatches tokens={theme.tokens} />
                </Table.Cell>

                <Table.Cell>
                  <Badge color={theme.is_locked ? 'gray' : 'blue'} variant="soft">
                    {theme.is_locked ? 'Built-in' : 'Custom'}
                  </Badge>
                </Table.Cell>

                <Table.Cell>
                  <Flex gap="1" wrap="wrap">
                    {isPrimary && (
                      <Badge color="cyan" variant="solid">
                        Active Primary
                      </Badge>
                    )}
                    {isDark && (
                      <Badge color="indigo" variant="solid">
                        Active Dark
                      </Badge>
                    )}
                    {!isActive && (
                      <Badge color="gray" variant="surface">
                        Inactive
                      </Badge>
                    )}
                  </Flex>
                </Table.Cell>

                <Table.Cell align="right">
                  <Flex justify="end" gap="2" wrap="wrap">
                    <Button
                      size="1"
                      variant="soft"
                      color="cyan"
                      onClick={() => onActivate(theme)}
                      aria-label={`Activate ${theme.name}`}
                    >
                      <CheckCircledIcon width="14" height="14" />
                      Activate
                    </Button>

                    {theme.is_locked ? (
                      <Button
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => onEdit(theme)}
                        aria-label={`View ${theme.name}`}
                      >
                        <EyeOpenIcon width="14" height="14" />
                        View
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="1"
                          variant="ghost"
                          color="blue"
                          onClick={() => onEdit(theme)}
                          aria-label={`Edit ${theme.name}`}
                        >
                          <Pencil1Icon width="14" height="14" />
                          Edit
                        </Button>
                        <Button
                          size="1"
                          variant="ghost"
                          color="gray"
                          onClick={() => onRename(theme)}
                          aria-label={`Rename ${theme.name}`}
                        >
                          Rename
                        </Button>
                      </>
                    )}

                    <Button
                      size="1"
                      variant="ghost"
                      color="gray"
                      disabled={isDuplicating}
                      onClick={() => onDuplicate(theme)}
                      aria-label={`Duplicate ${theme.name}`}
                    >
                      <CopyIcon width="14" height="14" />
                      Duplicate
                    </Button>

                    {!theme.is_locked && (
                      <Button
                        size="1"
                        variant="ghost"
                        color="red"
                        disabled={isActive}
                        onClick={() => onDelete(theme)}
                        title={isActive ? 'Cannot delete an active theme' : undefined}
                        aria-label={`Delete ${theme.name}`}
                      >
                        <TrashIcon width="14" height="14" />
                        Delete
                      </Button>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export default ThemesTable;
