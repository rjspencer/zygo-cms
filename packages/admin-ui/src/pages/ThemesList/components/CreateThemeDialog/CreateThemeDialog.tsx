import React, { useState } from 'react';
import { Dialog, Flex, Text, TextField, TextArea, Button, Select } from '@radix-ui/themes';
import type { CreateThemeDialogProps } from '../../types';

export const CreateThemeDialog: React.FC<CreateThemeDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePreset, setBasePreset] = useState('modern-editorial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Theme name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(name.trim(), description.trim() || undefined, basePreset);
      setName('');
      setDescription('');
      setBasePreset('modern-editorial');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create theme');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Create New Theme</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Create a new theme based on an existing preset to customize tokens.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            <label>
              <Text size="2" weight="bold" mb="1" as="div">
                Theme Name *
              </Text>
              <TextField.Root
                placeholder="e.g. Minimalist Midnight"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label>
              <Text size="2" weight="bold" mb="1" as="div">
                Description
              </Text>
              <TextArea
                placeholder="Optional description of the theme's aesthetic"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </label>

            <label>
              <Text size="2" weight="bold" mb="1" as="div">
                Base on Preset
              </Text>
              <Select.Root value={basePreset} onValueChange={setBasePreset}>
                <Select.Trigger aria-label="Base on Preset" style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="modern-editorial">Modern Editorial</Select.Item>
                  <Select.Item value="bento-brutalism">Bento-Brutalism</Select.Item>
                  <Select.Item value="bento-brutalism-dark">Bento-Brutalism (Dark)</Select.Item>
                </Select.Content>
              </Select.Root>
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
                {isSubmitting ? 'Creating...' : 'Create Theme'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreateThemeDialog;
