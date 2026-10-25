import React, { useState, useEffect } from 'react';
import { Dialog, Flex, Text, TextField, Button } from '@radix-ui/themes';
import type { RenameThemeDialogProps } from '../../types';

export const RenameThemeDialog: React.FC<RenameThemeDialogProps> = ({
  theme,
  open,
  onOpenChange,
  onRename,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setError(null);
    }
  }, [theme]);

  if (!theme) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Theme name cannot be empty.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onRename(theme.id, name.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename theme');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Rename Theme</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Update the display name of this custom theme.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            <label>
              <Text size="2" weight="bold" mb="1" as="div">
                Theme Name *
              </Text>
              <TextField.Root
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" color="cyan" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Rename'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default RenameThemeDialog;
