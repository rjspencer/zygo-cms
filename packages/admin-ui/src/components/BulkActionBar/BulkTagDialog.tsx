import React, { useState } from 'react';
import { Dialog, Flex, Button, TextField, Box } from '@radix-ui/themes';

export interface BulkTagDialogProps {
  count: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tags: string) => void;
  isPending?: boolean;
}

export const BulkTagDialog: React.FC<BulkTagDialogProps> = ({
  count,
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  const [tagsInput, setTagsInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagsInput.trim()) {
      onConfirm(tagsInput.trim());
      setTagsInput('');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Add Tags in Bulk</Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Add comma-separated tags to the {count} selected {count === 1 ? 'entry' : 'entries'}.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Box mb="4">
            <TextField.Root
              placeholder="e.g. news, featured, tutorial"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              aria-label="Tags to add"
              autoFocus
            />
          </Box>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button
                variant="soft"
                color="gray"
                type="button"
                disabled={isPending}
                onClick={() => setTagsInput('')}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="solid"
              color="blue"
              type="submit"
              disabled={!tagsInput.trim() || isPending}
              loading={isPending}
              aria-label="Confirm add tags"
            >
              Add Tags
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default BulkTagDialog;
