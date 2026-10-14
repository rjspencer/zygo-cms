import React from 'react';
import { Dialog, Box, Text, Flex, Button } from '@radix-ui/themes';
import type { ConflictDialogProps } from '../../types';

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onOpenChange,
  message,
  isSaving,
  onForceSave,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title color="red">Conflict Detected</Dialog.Title>
        <Dialog.Description size="2" mb="3" color="gray">
          The server encountered a conflict while saving this template:
        </Dialog.Description>

        <Box
          p="3"
          mb="4"
          style={{
            backgroundColor: 'var(--red-a2)',
            border: '1px solid var(--red-a6)',
            borderRadius: 'var(--radius-2)',
          }}
        >
          <Text size="2" color="red" style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>
            {message}
          </Text>
        </Box>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isSaving}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            color="red"
            variant="solid"
            disabled={isSaving}
            onClick={onForceSave}
            aria-label="Force Save"
          >
            {isSaving ? 'Force Saving...' : 'Force Save'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
