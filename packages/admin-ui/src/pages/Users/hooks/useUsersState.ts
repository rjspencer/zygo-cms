import { useState, useMemo } from 'react';
import type { UserItem, InvitedUserForEmail } from '../types';

export function useUsersState(users: UserItem[]) {
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [invitedUserForEmail, setInvitedUserForEmail] = useState<InvitedUserForEmail | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const nameMatch = (u.display_name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || roleMatch;
    });
  }, [users, search]);

  const openInviteModal = () => setIsInviteOpen(true);
  const closeInviteModal = () => setIsInviteOpen(false);

  const openEditModal = (user: UserItem) => setUserToEdit(user);
  const closeEditModal = () => setUserToEdit(null);

  const openDeleteModal = (user: UserItem) => setUserToDelete(user);
  const closeDeleteModal = () => setUserToDelete(null);

  const closeInvitedUserDialog = () => setInvitedUserForEmail(null);

  return {
    search,
    setSearch,
    filteredUsers,
    isInviteOpen,
    setIsInviteOpen,
    openInviteModal,
    closeInviteModal,
    userToEdit,
    setUserToEdit,
    openEditModal,
    closeEditModal,
    userToDelete,
    setUserToDelete,
    openDeleteModal,
    closeDeleteModal,
    invitedUserForEmail,
    setInvitedUserForEmail,
    closeInvitedUserDialog,
  };
}
