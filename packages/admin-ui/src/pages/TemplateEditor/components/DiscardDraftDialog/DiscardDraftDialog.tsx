import React from 'react';
import { Dialog, Flex, Button } from '@radix-ui/themes';
import type { DiscardDraftDialogProps } from '../../types';

export const DiscardDraftDialog: React.FC<DiscardDraftDialogProps> = ({
  open,
  onOpenChange,
  onCancel,
  onConfirmDiscard,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title color="red">Discard Unsaved Draft?</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          You have unsaved changes stored locally. Are you sure you want to discard them? This action cannot be undone.
        </Dialog.Description>
        <Flex gap="3" justify="end">
          <Button variant="soft" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirmDiscard}>
            Discard Changes
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
