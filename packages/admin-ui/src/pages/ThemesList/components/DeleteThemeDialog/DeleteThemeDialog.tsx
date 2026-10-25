import React, { useState } from 'react';
import { Dialog, Flex, Text, Button } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { DeleteThemeDialogProps } from '../../types';

export const DeleteThemeDialog: React.FC<DeleteThemeDialogProps> = ({
  theme,
  open,
  onOpenChange,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!theme) return null;

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirmDelete(theme.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete theme');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title color="red">
          <Flex align="center" gap="2">
            <ExclamationTriangleIcon width="20" height="20" />
            Delete Theme
          </Flex>
        </Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Are you sure you want to delete the theme <strong>{theme.name}</strong>? This action
          cannot be undone.
        </Dialog.Description>

        {error && (
          <Text color="red" size="2" mb="3" as="div">
            {error}
          </Text>
        )}

        <Flex gap="3" justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray" type="button">
              Cancel
            </Button>
          </Dialog.Close>
          <Button color="red" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Theme'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default DeleteThemeDialog;
