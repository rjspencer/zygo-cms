import React from 'react';
import { Table, Text, IconButton } from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import type { MenuTableProps } from '../types';

export const MenuTable: React.FC<MenuTableProps> = ({
  items,
  isLoading,
  onDelete,
}) => {
  return (
    <Table.Root variant="surface" mb="4">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Label</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Target URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>
            Actions
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={3}>
              <Text color="gray">Loading...</Text>
            </Table.Cell>
          </Table.Row>
        ) : items.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={3}>
              <Text color="gray">No items in this menu.</Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          items.map((item, idx) => (
            <Table.Row key={`${item.title}-${idx}`}>
              <Table.RowHeaderCell>
                <Text weight="medium">{item.title}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>
                <Text size="2" color="gray">
                  {item.url}
                </Text>
              </Table.Cell>
              <Table.Cell style={{ textAlign: 'right' }}>
                <IconButton
                  style={{ cursor: 'pointer' }}
                  size="2"
                  variant="ghost"
                  color="red"
                  onClick={() => onDelete(idx)}
                  title="Remove link"
                  aria-label={`Remove ${item.title}`}
                >
                  <TrashIcon width="18" height="18" />
                </IconButton>
              </Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table.Root>
  );
};
