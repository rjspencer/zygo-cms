import React from 'react';
import { Dialog, Button, Flex } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { LayoutResetDialogProps } from './types';

export const LayoutResetDialog: React.FC<LayoutResetDialogProps> = ({
  open,
  onOpenChange,
  templateName,
  onConfirm,
  isSaving,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <ExclamationTriangleIcon color="var(--red-9)" />
            Reset {templateName} to Default?
          </Flex>
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          This will restore the built-in system HTML structure and default CSS stylesheet. A
          backup snapshot will automatically be saved to revisions before resetting.
        </Dialog.Description>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isSaving}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="solid"
            color="red"
            onClick={onConfirm}
            disabled={isSaving}
            data-testid="confirm-reset-btn"
          >
            {isSaving ? 'Resetting...' : 'Yes, Reset to Default'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default LayoutResetDialog;
