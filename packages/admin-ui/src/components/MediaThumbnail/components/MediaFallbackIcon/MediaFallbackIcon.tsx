import React from 'react';
import { Flex } from '@radix-ui/themes';
import { ImageIcon, VideoIcon } from '@radix-ui/react-icons';
import type { MediaFallbackIconProps } from '../../types';

export const MediaFallbackIcon: React.FC<MediaFallbackIconProps> = ({
  isVideo,
  isCompact,
}) => {
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {isVideo ? (
        <VideoIcon
          width={isCompact ? '32' : '36'}
          height={isCompact ? '32' : '36'}
          color="var(--gray-9)"
          data-testid="video-fallback-icon"
        />
      ) : (
        <ImageIcon
          width={isCompact ? '32' : '36'}
          height={isCompact ? '32' : '36'}
          color="var(--gray-9)"
          data-testid="image-fallback-icon"
        />
      )}
    </Flex>
  );
};

export default MediaFallbackIcon;
