import { useState, useRef, useCallback } from 'react';
import type React from 'react';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB edge worker upload limit
const WARN_VIDEO_SIZE = 10 * 1024 * 1024; // 10 MB

interface UseMediaUploadOptions {
  onUpload: (file: File) => void;
}

export function useMediaUpload({ onUpload }: UseMediaUploadOptions) {
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFileError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setFileError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed upload size is 25 MB.`
        );
        resetFileInput();
        return;
      }

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogv|ogg)$/i.test(file.name);
      if (isVideo && file.size > WARN_VIDEO_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const confirmed = window.confirm(
          `Warning: This video is ${sizeMb} MB. Large background videos may cause slower page loading and buffering on mobile connections. We recommend videos under 5-10 MB.\n\nDo you want to continue uploading?`
        );
        if (!confirmed) {
          resetFileInput();
          return;
        }
      }

      onUpload(file);
    },
    [onUpload, resetFileInput]
  );

  return {
    fileError,
    setFileError,
    fileInputRef,
    handleFileUpload,
    resetFileInput,
  };
}
