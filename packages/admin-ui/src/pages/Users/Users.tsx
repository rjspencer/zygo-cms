import React from 'react';
import { Box, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useUsersData } from './hooks/useUsersData';
import { useUsersState } from './hooks/useUsersState';
import { UsersHeader } from './components/UsersHeader/UsersHeader';
import { UsersTable } from './components/UsersTable/UsersTable';
import { InviteUserDialog } from './components/InviteUserDialog/InviteUserDialog';
import { EditUserDialog } from './components/EditUserDialog/EditUserDialog';
import { DeleteUserDialog } from './components/DeleteUserDialog/DeleteUserDialog';
import { UserInvitedDialog } from './components/UserInvitedDialog/UserInvitedDialog';

export const Users: React.FC = () => {
  const {
    users,
    loading,
    fetchError,
    inviteMutation,
    editMutation,
    deleteMutation,
  } = useUsersData({
    onInviteSuccess: (data, variables) => {
      userState.closeInviteModal();
      userState.setInvitedUserForEmail({
        email: variables.email,
        displayName:
          variables.display_name ||
          (data as any).displayName ||
          data.display_name ||
          '',
        role: variables.role || data.role || 'author',
      });
    },
    onEditSuccess: () => {
      userState.closeEditModal();
    },
    onDeleteSuccess: () => {
      userState.closeDeleteModal();
    },
  });

  const userState = useUsersState(users);

  return (
    <Box>
      <UsersHeader
        onInviteClick={() => {
          userState.openInviteModal();
          inviteMutation.reset();
        }}
      />

      {fetchError && (
        <Callout.Root color="red" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{fetchError}</Callout.Text>
        </Callout.Root>
      )}

      <UsersTable
        search={userState.search}
        onSearchChange={userState.setSearch}
        loading={loading}
        users={userState.filteredUsers}
        onEditUser={(user) => {
          userState.openEditModal(user);
          editMutation.reset();
        }}
        onDeleteUser={(user) => {
          userState.openDeleteModal(user);
          deleteMutation.reset();
        }}
      />

      <InviteUserDialog
        open={userState.isInviteOpen}
        onOpenChange={(open) => {
          userState.setIsInviteOpen(open);
          if (open) inviteMutation.reset();
        }}
        onSubmit={(payload) => inviteMutation.mutate(payload)}
        isPending={inviteMutation.isPending}
        error={(inviteMutation.error as Error)?.message || null}
      />

      <EditUserDialog
        user={userState.userToEdit}
        onClose={userState.closeEditModal}
        onSubmit={(id, payload) => editMutation.mutate({ id, payload })}
        isPending={editMutation.isPending}
        error={(editMutation.error as Error)?.message || null}
      />

      <DeleteUserDialog
        user={userState.userToDelete}
        onClose={userState.closeDeleteModal}
        onConfirmDelete={(id) => deleteMutation.mutate(id)}
        isPending={deleteMutation.isPending}
        error={(deleteMutation.error as Error)?.message || null}
      />

      <UserInvitedDialog
        invitedUser={userState.invitedUserForEmail}
        onClose={userState.closeInvitedUserDialog}
      />
    </Box>
  );
};

export default Users;
