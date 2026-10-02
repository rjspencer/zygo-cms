import React, { useState, useEffect, useCallback } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Table,
  Badge,
  TextField,
  TextArea,
  IconButton,
  Dialog,
  Avatar,
  Select,
  Callout,
} from '@radix-ui/themes';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { apiFetch } from '../utils/api';

export interface UserItem {
  id: number;
  auth_provider_id?: string;
  email: string | null;
  display_name: string | null;
  role: string;
  bio?: string | null;
  website?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Invite/Create User Dialog State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteRole, setInviteRole] = useState('author');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Edit User Dialog State
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState('author');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete User Dialog State
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        const userList: UserItem[] = Array.isArray(data) ? data : (data.users || []);
        // Only show non-deleted users
        setUsers(userList.filter((u) => !u.deleted_at));
      } else {
        const errText = await res.text();
        setFetchError(errText || 'Failed to load users');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setUserToEdit(user);
    setEditDisplayName(user.display_name || '');
    setEditRole(user.role || 'author');
    setEditBio(user.bio || '');
    setEditWebsite(user.website || '');
    setEditAvatarUrl(user.avatar_url || '');
    setEditError(null);
  };

  // Submit Invite User
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Email address is required');
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          display_name: inviteDisplayName.trim() || undefined,
          role: inviteRole,
        }),
      });

      if (res.ok) {
        const createdUser: UserItem = await res.json();
        setUsers((prev) => [...prev, createdUser]);
        setIsInviteOpen(false);
        setInviteEmail('');
        setInviteDisplayName('');
        setInviteRole('author');
      } else {
        let errMsg = 'Failed to invite user';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        setInviteError(errMsg);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Network error occurred');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null,
          website: editWebsite.trim() || null,
          avatar_url: editAvatarUrl.trim() || null,
        }),
      });

      if (res.ok) {
        const updatedUser: UserItem = await res.json().catch(() => ({
          ...userToEdit,
          role: editRole,
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null,
          website: editWebsite.trim() || null,
          avatar_url: editAvatarUrl.trim() || null,
        }));

        setUsers((prev) =>
          prev.map((u) => (u.id === userToEdit.id ? { ...u, ...updatedUser } : u))
        );
        setUserToEdit(null);
      } else {
        let errMsg = 'Failed to update user';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        setEditError(errMsg);
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error occurred');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit Delete User
  const handleDeleteSubmit = async () => {
    if (!userToDelete) return;

    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        let errMsg = 'Failed to delete user';
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          const txt = await res.text();
          if (txt) errMsg = txt;
        }
        setDeleteError(errMsg);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Network error occurred');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'iris';
      case 'editor':
        return 'purple';
      case 'author':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getInitials = (user: UserItem) => {
    if (user.display_name && user.display_name.trim().length > 0) {
      const parts = user.display_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.display_name.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const nameMatch = (u.display_name || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const roleMatch = (u.role || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || roleMatch;
  });

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Users
          </Heading>
          <Text size="2" color="gray">
            Manage user accounts, roles, and profiles
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => { setIsInviteOpen(true); setInviteError(null); }}>
          <PlusIcon width="16" height="16" />
          Invite User
        </Button>
      </Flex>

      {fetchError && (
        <Callout.Root color="red" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{fetchError}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="2">
        {/* Search */}
        <Box mb="4">
          <TextField.Root
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            ) : filteredUsers.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                  <Text color="gray">No users found</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredUsers.map((user) => (
                <Table.Row key={user.id}>
                  {/* User Avatar + Name + Email */}
                  <Table.RowHeaderCell>
                    <Flex align="center" gap="3">
                      <Avatar
                        size="2"
                        src={user.avatar_url || undefined}
                        fallback={getInitials(user)}
                        radius="full"
                        color="iris"
                      />
                      <Box>
                        <Text weight="medium" style={{ display: 'block' }}>
                          {user.display_name || user.email || 'Anonymous'}
                        </Text>
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                          {user.email || 'No email provided'}
                        </Text>
                      </Box>
                    </Flex>
                  </Table.RowHeaderCell>

                  {/* Role */}
                  <Table.Cell>
                    <Badge color={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </Table.Cell>

                  {/* Bio & Links */}
                  <Table.Cell>
                    <Box style={{ maxWidth: '240px' }}>
                      {user.bio ? (
                        <Text
                          size="2"
                          color="gray"
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={user.bio}
                        >
                          {user.bio}
                        </Text>
                      ) : null}
                      {user.website ? (
                        <a
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--iris-10)',
                            textDecoration: 'none',
                            fontSize: '12px',
                          }}
                        >
                          <ExternalLinkIcon width="12" height="12" />
                          <span
                            style={{
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.website.replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      ) : !user.bio ? (
                        <Text size="1" color="gray">
                          —
                        </Text>
                      ) : null}
                    </Box>
                  </Table.Cell>

                  {/* Date Added */}
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {user.created_at ? (user.created_at.split(/[ T]/)[0] || user.created_at) : '—'}
                    </Text>
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell style={{ textAlign: 'right' }}>
                    <Flex justify="end" gap="1">
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => openEditModal(user)}
                        title="Edit User"
                        aria-label={`Edit ${user.display_name || user.email}`}
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="red"
                        onClick={() => { setUserToDelete(user); setDeleteError(null); }}
                        title="Delete User"
                        aria-label={`Delete ${user.display_name || user.email}`}
                      >
                        <TrashIcon width="16" height="16" />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Card>

      {/* Invite/Create User Dialog */}
      <Dialog.Root open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <Dialog.Content maxWidth="480px">
          <form onSubmit={handleInviteSubmit}>
            <Dialog.Title>Invite User</Dialog.Title>
            <Dialog.Description size="2" mb="4" color="gray">
              Invite a new member to access Zygo CMS with designated permissions.
            </Dialog.Description>

            {inviteError && (
              <Callout.Root color="red" size="1" mb="3">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{inviteError}</Callout.Text>
              </Callout.Root>
            )}

            <Flex direction="column" gap="3" mb="4">
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Email Address *
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Display Name
                </Text>
                <TextField.Root
                  placeholder="e.g. Jane Doe"
                  value={inviteDisplayName}
                  onChange={(e) => setInviteDisplayName(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Role
                </Text>
                <Select.Root value={inviteRole} onValueChange={setInviteRole}>
                  <Select.Trigger style={{ width: '100%' }} aria-label="Select role" />
                  <Select.Content>
                    <Select.Item value="admin">Admin</Select.Item>
                    <Select.Item value="editor">Editor</Select.Item>
                    <Select.Item value="author">Author</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>
            </Flex>

            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button" disabled={inviteSubmitting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="solid"
                color="iris"
                type="submit"
                disabled={inviteSubmitting || !inviteEmail.trim()}
              >
                {inviteSubmitting ? 'Inviting...' : 'Invite User'}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit User Dialog */}
      <Dialog.Root open={userToEdit !== null} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <Dialog.Content maxWidth="520px">
          <form onSubmit={handleEditSubmit}>
            <Dialog.Title>Edit User</Dialog.Title>
            <Dialog.Description size="2" mb="4" color="gray">
              Update user details and permissions for {userToEdit?.email}.
            </Dialog.Description>

            {editError && (
              <Callout.Root color="red" size="1" mb="3">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>{editError}</Callout.Text>
              </Callout.Root>
            )}

            <Flex direction="column" gap="3" mb="4">
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Display Name
                </Text>
                <TextField.Root
                  placeholder="e.g. Jane Doe"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Role
                </Text>
                <Select.Root value={editRole} onValueChange={setEditRole}>
                  <Select.Trigger style={{ width: '100%' }} aria-label="Select role" />
                  <Select.Content>
                    <Select.Item value="admin">Admin</Select.Item>
                    <Select.Item value="editor">Editor</Select.Item>
                    <Select.Item value="author">Author</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Avatar URL
                </Text>
                <TextField.Root
                  placeholder="https://example.com/avatar.png"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Website
                </Text>
                <TextField.Root
                  placeholder="https://example.com"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Bio
                </Text>
                <TextArea
                  placeholder="Short bio about the user..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                />
              </Box>
            </Flex>

            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button" disabled={editSubmitting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="solid" color="iris" type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Delete User</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete &ldquo;{userToDelete?.display_name || userToDelete?.email}&rdquo;? This action will revoke their access to the CMS.
          </Dialog.Description>

          {deleteError && (
            <Callout.Root color="red" size="1" mb="3">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{deleteError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={deleteSubmitting}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="solid"
              color="red"
              disabled={deleteSubmitting}
              onClick={handleDeleteSubmit}
            >
              {deleteSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default Users;
