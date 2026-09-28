import React, { useState, useEffect } from 'react';
import { Flex } from '@radix-ui/themes';
import { ImageIcon } from '@radix-ui/react-icons';

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

  const isImage = !type || type.startsWith('image/');
  const isCompact = height === '100px';

  if (!isImage || hasError) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <ImageIcon
          width={isCompact ? '32' : '36'}
          height={isCompact ? '32' : '36'}
          color="var(--gray-9)"
        />
      </Flex>
    );
  }

  return (
    <img
      src={src}
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
