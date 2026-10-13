import React, { useState, useEffect } from 'react';
import { Box, Flex } from '@radix-ui/themes';
import { ImageIcon, VideoIcon, PlayIcon } from '@radix-ui/react-icons';
import { getPublicSiteUrl } from '../utils/api';

export interface MediaThumbnailProps {
  src: string;
  alt: string;
  type?: string;
  height?: string;
}

export const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  src,
  alt,
  type,
  height = '140px',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isVideo =
    Boolean(type?.startsWith('video/')) ||
    /\.(mp4|webm|ogv|ogg)$/i.test(src.split('?')[0]);
  const isImage = !type ? !isVideo : type.startsWith('image/');
  const isCompact = height === '100px';
  const mediaSrc =
    src.startsWith('/') && !src.startsWith('//') ? getPublicSiteUrl(src) : src;

  if (hasError || (!isImage && !isVideo)) {
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
  }

  if (isVideo) {
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
          src={`${mediaSrc.split('#')[0]}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          aria-label={alt}
          onError={() => setHasError(true)}
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
  }

  return (
    <img
      src={mediaSrc}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
};

export default MediaThumbnail;
