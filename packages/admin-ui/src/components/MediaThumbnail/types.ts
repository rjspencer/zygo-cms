export interface MediaThumbnailProps {
  src: string;
  alt: string;
  type?: string;
  height?: string;
}

export interface MediaFallbackIconProps {
  isVideo: boolean;
  isCompact: boolean;
}

export interface MediaVideoPreviewProps {
  src: string;
  alt: string;
  onError: () => void;
}
