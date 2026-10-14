import React from 'react';
import { Dialog, Flex, Button, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import type { UserItem } from '../../types';

interface DeleteUserDialogProps {
  user: UserItem | null;
  onClose: () => void;
  onConfirmDelete: (id: number) => void;
  isPending: boolean;
  error: string | null;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  user,
  onClose,
  onConfirmDelete,
  isPending,
  error,
}) => {
  const handleDelete = () => {
    if (!user) return;
    onConfirmDelete(user.id);
  };

  return (
    <Dialog.Root open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Delete User</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Are you sure you want to delete &ldquo;
          {user?.display_name || user?.email}&rdquo;? This action will revoke their access to the CMS.
        </Dialog.Description>

        {error && (
          <Callout.Root color="red" size="1" mb="3">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isPending}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="solid"
            color="red"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
