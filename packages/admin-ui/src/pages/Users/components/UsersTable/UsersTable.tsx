import React from 'react';
import { Card, Box, TextField, Table, Text } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { UserItem } from '../../types';
import { UserTableRow } from './UserTableRow';

interface UsersTableProps {
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  users: UserItem[];
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (user: UserItem) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  search,
  onSearchChange,
  loading,
  users,
  onEditUser,
  onDeleteUser,
}) => {
  return (
    <Card size="2">
      {/* Search */}
      <Box mb="4">
        <TextField.Root
          placeholder="Search users by name, email, or role..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      {/* Users Table */}
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Bio &amp; Links</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Date Added</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                <Text color="gray">Loading users...</Text>
              </Table.Cell>
            </Table.Row>
          ) : users.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                <Text color="gray">No users found</Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                onEdit={onEditUser}
                onDelete={onDeleteUser}
              />
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Card>
  );
};
