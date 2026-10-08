import React from 'react';
import { AlertDialog, Button, Flex } from '@radix-ui/themes';
import type { Blocker } from 'react-router-dom';

interface UnsavedChangesDialogProps {
  blocker: Blocker;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({ blocker }) => (
  <AlertDialog.Root open={blocker.state === 'blocked'}>
    <AlertDialog.Content maxWidth="450px">
      <AlertDialog.Title>Unsaved changes</AlertDialog.Title>
      <AlertDialog.Description size="2">
        You have unsaved changes. If you leave this page they will be lost.
      </AlertDialog.Description>
      <Flex gap="3" mt="4" justify="end">
        <Button
          variant="soft"
          color="gray"
          onClick={() => blocker.state === 'blocked' && blocker.reset()}
        >
          Stay
        </Button>
        <Button
          color="red"
          onClick={() => blocker.state === 'blocked' && blocker.proceed()}
        >
          Leave without saving
        </Button>
      </Flex>
    </AlertDialog.Content>
  </AlertDialog.Root>
);

export default UnsavedChangesDialog;
