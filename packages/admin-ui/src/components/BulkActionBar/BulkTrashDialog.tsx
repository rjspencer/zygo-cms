import React from 'react';
import { Dialog, Flex, Button } from '@radix-ui/themes';

export interface BulkTrashDialogProps {
  count: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export const BulkTrashDialog: React.FC<BulkTrashDialogProps> = ({
  count,
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Move Entries to Trash</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Are you sure you want to move {count} {count === 1 ? 'entry' : 'entries'} to the trash?
          Soft-deleted items can be restored from the Trash.
        </Dialog.Description>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isPending}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="solid"
            color="red"
            onClick={onConfirm}
            loading={isPending}
            aria-label="Confirm move to trash"
          >
            Move to Trash
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default BulkTrashDialog;
