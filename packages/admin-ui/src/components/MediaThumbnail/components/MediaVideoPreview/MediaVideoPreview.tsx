import React from 'react';
import { Box, Flex } from '@radix-ui/themes';
import { PlayIcon } from '@radix-ui/react-icons';
import type { MediaVideoPreviewProps } from '../../types';

export const MediaVideoPreview: React.FC<MediaVideoPreviewProps> = ({
  src,
  alt,
  onError,
}) => {
  const videoSrc = `${src.split('#')[0]}#t=0.1`;

  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--gray-3)',
      }}
    >
      <video
        src={videoSrc}
        preload="metadata"
        muted
        playsInline
        aria-label={alt}
        onError={onError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        data-testid="media-video-thumbnail"
      />
      <Flex
        align="center"
        justify="center"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          borderRadius: 4,
          padding: '2px 5px',
          pointerEvents: 'none',
        }}
        data-testid="media-video-badge"
      >
        <PlayIcon width="10" height="10" color="#ffffff" />
      </Flex>
    </Box>
  );
};

export default MediaVideoPreview;
