import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { UploadIcon, ReloadIcon } from '@radix-ui/react-icons';
import type { MediaHeaderProps } from '../types';

export const MediaHeader: React.FC<MediaHeaderProps> = ({
  onUploadClick,
  onSyncClick,
  isUploading,
  isSyncing,
  fileInputRef,
  onFileChange,
}) => {
  const isDev = Boolean(import.meta.env.DEV && (import.meta.env.DEV as any) !== 'false');

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Media Library
        </Heading>
        <Text size="2" color="gray">
          Upload and manage assets <em>(images & MP4/WebM/OGG videos)</em>
        </Text>
      </Box>
      <Flex gap="2">
        {isDev && (
          <Button
            variant="outline"
            onClick={onSyncClick}
            disabled={isSyncing || isUploading}
            loading={isSyncing}
            aria-label="Sync"
          >
            <ReloadIcon width="18" height="18" />
            Sync
          </Button>
        )}
        <Button
          variant="solid"
          color="cyan"
          onClick={onUploadClick}
          disabled={isUploading || isSyncing}
          loading={isUploading}
          aria-label="Upload Image / Video"
        >
          <UploadIcon width="18" height="18" />
          Upload Image / Video
        </Button>
      </Flex>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*,video/mp4,video/webm,video/ogg"
        style={{ display: 'none' }}
        aria-label="Upload Media Input"
        data-testid="media-file-input"
      />
    </Flex>
  );
};
