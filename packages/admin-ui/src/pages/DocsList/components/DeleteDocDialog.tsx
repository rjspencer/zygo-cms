import React from 'react';
import { Dialog, Flex, Button } from '@radix-ui/themes';
import type { DocItem } from '../types';

export interface DeleteDocDialogProps {
  doc: DocItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteDocDialog: React.FC<DeleteDocDialogProps> = ({
  doc,
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Delete Doc</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Are you sure you want to delete &ldquo;{doc?.title}&rdquo;? This action will
          remove it from the edge database.
        </Dialog.Description>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isDeleting}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="solid"
            color="red"
            onClick={onConfirm}
            loading={isDeleting}
          >
            Delete
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default DeleteDocDialog;
