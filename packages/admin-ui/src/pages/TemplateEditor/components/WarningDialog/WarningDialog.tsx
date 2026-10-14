import React from 'react';
import { Dialog, Flex, Button, Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { WarningDialogProps } from '../../types';

export const WarningDialog: React.FC<WarningDialogProps> = ({
  open,
  onOpenChange,
  warnings,
  isSaving,
  onSaveAnyway,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title color="amber">Template Warnings</Dialog.Title>
        <Dialog.Description size="2" mb="3" color="gray">
          The template has validation warnings that require confirmation:
        </Dialog.Description>

        <Callout.Root color="amber" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </Callout.Text>
        </Callout.Root>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            color="amber"
            variant="solid"
            disabled={isSaving}
            onClick={onSaveAnyway}
            aria-label="Save Anyway"
          >
            {isSaving ? 'Saving...' : 'Save Anyway'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
