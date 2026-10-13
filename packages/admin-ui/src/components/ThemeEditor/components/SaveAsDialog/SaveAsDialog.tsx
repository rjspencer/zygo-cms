import React from 'react';
import { Dialog, Box, Text, TextField, Flex, Button } from '@radix-ui/themes';

export interface SaveAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveAsName: string;
  onSaveAsNameChange: (name: string) => void;
  isSaving: boolean;
  onConfirmSaveAs: (e?: React.FormEvent) => void;
}

export const SaveAsDialog: React.FC<SaveAsDialogProps> = ({
  open,
  onOpenChange,
  saveAsName,
  onSaveAsNameChange,
  isSaving,
  onConfirmSaveAs,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Save Custom Theme</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Save your customizations as a reusable theme in the theme picker dropdown.
        </Dialog.Description>
        <form onSubmit={onConfirmSaveAs}>
          <Box mb="4">
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              Theme Name
            </Text>
            <TextField.Root
              aria-label="Theme Name"
              value={saveAsName}
              onChange={(e) => onSaveAsNameChange(e.target.value)}
              placeholder="Modern Editorial Custom"
              autoFocus
            />
          </Box>
          <Flex gap="3" justify="end">
            <Button
              type="button"
              variant="soft"
              color="gray"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" color="cyan" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Custom Theme'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
