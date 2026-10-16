import React from 'react';
import { Dialog, Flex, Box, Text, Button, IconButton } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { MediaPickerModalProps } from './types';
import { useMediaPickerData } from './hooks';
import { MediaPickerToolbar, MediaPickerGrid } from './components';

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const {
    search,
    setSearch,
    fileInputRef,
    fileError,
    items,
    uploadMutation,
    handleFileUpload,
    filteredItems,
    handleSelectItem,
  } = useMediaPickerData({ open, onClose, onSelect });

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Content maxWidth="680px">
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title style={{ margin: 0 }}>Select Media</Dialog.Title>
          <Dialog.Close>
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={onClose}
              aria-label="Close"
            >
              <Cross2Icon width="16" height="16" />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <Dialog.Description size="2" color="gray" mb="3">
          Choose an asset from your media library (Images & MP4/WebM/OGG videos).
        </Dialog.Description>

        <MediaPickerToolbar
          search={search}
          setSearch={setSearch}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          isUploading={uploadMutation.isPending}
        />

        {(fileError || uploadMutation.isError) && (
          <Box mb="3">
            <Text color="red" size="2">
              {fileError || uploadMutation.error?.message || 'Failed to upload media'}
            </Text>
          </Box>
        )}

        <MediaPickerGrid
          items={items}
          filteredItems={filteredItems}
          onSelectItem={handleSelectItem}
        />

        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default MediaPickerModal;
