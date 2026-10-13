import React from 'react';
import { AlertDialog, Flex, Button } from '@radix-ui/themes';

export interface DiscardChangesDialogProps {
  pendingThemeSwitch: string | null;
  selectedThemeName: string;
  onCancel: () => void;
  onSaveAsCustom: () => void;
  onConfirmDiscard: (themeName: string) => void;
}

export const DiscardChangesDialog: React.FC<DiscardChangesDialogProps> = ({
  pendingThemeSwitch,
  selectedThemeName,
  onCancel,
  onSaveAsCustom,
  onConfirmDiscard,
}) => {
  return (
    <AlertDialog.Root
      open={Boolean(pendingThemeSwitch)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialog.Content maxWidth="460px">
        <AlertDialog.Title>Are you sure you want to switch themes?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          You have unsaved changes to <strong>{selectedThemeName}</strong>. Switching to{' '}
          <strong>{pendingThemeSwitch}</strong> will discard your changes unless you save them to a
          custom theme first.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end" wrap="wrap">
          <Button variant="soft" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" color="cyan" onClick={onSaveAsCustom}>
            Save As Custom Theme...
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (pendingThemeSwitch) {
                onConfirmDiscard(pendingThemeSwitch);
              }
            }}
          >
            Discard Changes & Switch
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
