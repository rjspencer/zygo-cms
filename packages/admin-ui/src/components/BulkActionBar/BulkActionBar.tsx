import React, { useState } from 'react';
import { Flex, Text, Button, Card, Badge } from '@radix-ui/themes';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  BookmarkIcon,
  TrashIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { BulkTrashDialog } from './BulkTrashDialog';
import { BulkTagDialog } from './BulkTagDialog';

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onAddTags: (tags: string) => void;
  onTrash: () => void;
  isPending?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onPublish,
  onUnpublish,
  onAddTags,
  onTrash,
  isPending = false,
}) => {
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleConfirmTrash = () => {
    setIsTrashOpen(false);
    onTrash();
  };

  const handleConfirmAddTags = (tags: string) => {
    setIsTagOpen(false);
    onAddTags(tags);
  };

  return (
    <>
      <Card
        size="1"
        mb="3"
        style={{
          backgroundColor: 'var(--accent-a2)',
          borderColor: 'var(--accent-a6)',
        }}
        role="region"
        aria-label="Bulk actions toolbar"
        data-testid="bulk-action-bar"
      >
        <Flex justify="between" align="center" wrap="wrap" gap="3" px="2" py="1">
          <Flex align="center" gap="2">
            <Badge size="2" color="indigo" radius="full">
              {selectedCount}
            </Badge>
            <Text size="2" weight="medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </Text>
          </Flex>

          <Flex align="center" gap="2" wrap="wrap">
            <Button
              size="1"
              variant="soft"
              color="green"
              onClick={onPublish}
              disabled={isPending}
              aria-label="Bulk publish selected entries"
            >
              <CheckCircledIcon width="15" height="15" />
              Publish
            </Button>

            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={onUnpublish}
              disabled={isPending}
              aria-label="Bulk unpublish selected entries"
            >
              <CrossCircledIcon width="15" height="15" />
              Unpublish
            </Button>

            <Button
              size="1"
              variant="soft"
              color="blue"
              onClick={() => setIsTagOpen(true)}
              disabled={isPending}
              aria-label="Bulk add tags to selected entries"
            >
              <BookmarkIcon width="15" height="15" />
              Add Tags
            </Button>

            <Button
              size="1"
              variant="soft"
              color="red"
              onClick={() => setIsTrashOpen(true)}
              disabled={isPending}
              aria-label="Bulk move selected entries to trash"
            >
              <TrashIcon width="15" height="15" />
              Move to Trash
            </Button>

            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={onClearSelection}
              disabled={isPending}
              aria-label="Deselect all entries"
            >
              <Cross2Icon width="15" height="15" />
              Deselect
            </Button>
          </Flex>
        </Flex>
      </Card>

      <BulkTrashDialog
        count={selectedCount}
        isOpen={isTrashOpen}
        onOpenChange={setIsTrashOpen}
        onConfirm={handleConfirmTrash}
        isPending={isPending}
      />

      <BulkTagDialog
        count={selectedCount}
        isOpen={isTagOpen}
        onOpenChange={setIsTagOpen}
        onConfirm={handleConfirmAddTags}
        isPending={isPending}
      />
    </>
  );
};

export default BulkActionBar;
