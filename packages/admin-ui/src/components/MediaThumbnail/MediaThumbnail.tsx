import React, { useState, useEffect } from 'react';
import { getPublicSiteUrl } from '../../utils/api';
import type { MediaThumbnailProps } from './types';
import { MediaFallbackIcon, MediaVideoPreview } from './components';

export const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  src,
  alt,
  type,
  height = '140px',
  size,
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

  let adjustedSrc = src;
  if (isImage && size && !src.includes('size=')) {
    const separator = src.includes('?') ? '&' : '?';
    adjustedSrc = `${src}${separator}size=${size}`;
  }

  const mediaSrc =
    adjustedSrc.startsWith('/') && !adjustedSrc.startsWith('//')
      ? getPublicSiteUrl(adjustedSrc)
      : adjustedSrc;

  if (hasError || (!isImage && !isVideo)) {
    return <MediaFallbackIcon isVideo={isVideo} isCompact={isCompact} />;
  }

  if (isVideo) {
    return (
      <MediaVideoPreview
        src={mediaSrc}
        alt={alt}
        onError={() => setHasError(true)}
      />
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
