import { createContext, useContext } from 'react';
import type { OpenMediaPicker } from '../types';

export const MediaPickerContext = createContext<OpenMediaPicker>(() => {
  throw new Error('useOpenMediaPicker must be used within a MediaPickerProvider');
});

/** Returns `openMediaPicker(callback)`; the callback receives the chosen media URL/alt text. */
export const useOpenMediaPicker = (): OpenMediaPicker => useContext(MediaPickerContext);
