import React, { useCallback, useState } from 'react';
import { MediaPickerModal } from '../../../../components/MediaPickerModal';
import { MediaPickerContext } from '../../context/MediaPickerContext';
import type { MediaPickerCallback, OpenMediaPicker } from '../../types';

interface MediaPickerProviderProps {
  children: React.ReactNode;
}

/** Owns the media picker modal and exposes `openMediaPicker(callback)` to descendants. */
export const MediaPickerProvider: React.FC<MediaPickerProviderProps> = ({ children }) => {
  const [callback, setCallback] = useState<MediaPickerCallback | null>(null);

  const openMediaPicker = useCallback<OpenMediaPicker>((cb) => setCallback(() => cb), []);

  const handleSelect = (url: string, altText: string) => {
    callback?.(url, altText);
    setCallback(null);
  };

  return (
    <MediaPickerContext.Provider value={openMediaPicker}>
      {children}
      <MediaPickerModal open={callback !== null} onClose={() => setCallback(null)} onSelect={handleSelect} />
    </MediaPickerContext.Provider>
  );
};
