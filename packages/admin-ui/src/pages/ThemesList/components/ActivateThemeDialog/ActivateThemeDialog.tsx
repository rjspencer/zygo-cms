import React, { useState } from 'react';
import { Dialog, Flex, Text, RadioGroup, Button } from '@radix-ui/themes';
import type { ActivateThemeDialogProps } from '../../types';

export const ActivateThemeDialog: React.FC<ActivateThemeDialogProps> = ({
  theme,
  open,
  onOpenChange,
  onActivate,
}) => {
  const [role, setRole] = useState<'primary' | 'dark'>('primary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!theme) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onActivate(theme.id, role);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate theme');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Activate Theme: {theme.name}</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Choose which role this theme should serve on the live public website.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <RadioGroup.Root
              value={role}
              onValueChange={(val) => setRole(val as 'primary' | 'dark')}
              aria-label="Theme activation role"
            >
              <Flex direction="column" gap="3">
                <Text as="label" size="2">
                  <Flex gap="2" align="start">
                    <RadioGroup.Item value="primary" aria-label="Set as Primary Theme" />
                    <Flex direction="column">
                      <Text weight="bold">Set as Primary Theme</Text>
                      <Text size="1" color="gray">
                        Active default site theme used across standard browsing and light mode.
                      </Text>
                    </Flex>
                  </Flex>
                </Text>

                <Text as="label" size="2">
                  <Flex gap="2" align="start">
                    <RadioGroup.Item value="dark" aria-label="Set as Dark Mode Variant" />
                    <Flex direction="column">
                      <Text weight="bold">Set as Dark Mode Variant</Text>
                      <Text size="1" color="gray">
                        Used automatically when visitor OS or browser prefers dark scheme.
                      </Text>
                    </Flex>
                  </Flex>
                </Text>
              </Flex>
            </RadioGroup.Root>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" color="cyan" disabled={isSubmitting}>
                {isSubmitting ? 'Activating...' : 'Activate Theme'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ActivateThemeDialog;
