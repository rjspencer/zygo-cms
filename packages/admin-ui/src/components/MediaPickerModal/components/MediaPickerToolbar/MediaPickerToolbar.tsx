import React from 'react';
import { Flex, Box, Card, TextField, Button } from '@radix-ui/themes';
import { MagnifyingGlassIcon, UploadIcon } from '@radix-ui/react-icons';
import type { MediaPickerToolbarProps } from '../../types';

export const MediaPickerToolbar: React.FC<MediaPickerToolbarProps> = ({
  search,
  setSearch,
  fileInputRef,
  handleFileUpload,
  isUploading,
  onSearchChange,
  onFileUpload,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setSearch(val);
    }
  };

  const onFileInputChange = onFileUpload || handleFileUpload;

  return (
    <Flex gap="3" align="center" mb="3">
      <Box style={{ flex: 1 }}>
        <Card size="1">
          <TextField.Root
            placeholder="Search media by filename..."
            value={search}
            onChange={handleSearchChange}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Card>
      </Box>
      <Button
        variant="solid"
        color="cyan"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        loading={isUploading}
        aria-label="Upload Image / Video"
      >
        <UploadIcon width="16" height="16" />
        Upload Image / Video
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept="image/*,video/mp4,video/webm,video/ogg"
        style={{ display: 'none' }}
        aria-label="Upload Media Input"
        data-testid="media-file-input"
      />
    </Flex>
  );
};

export default MediaPickerToolbar;
