import type React from 'react';

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, altText: string) => void;
}

export interface MediaItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface MediaPickerToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  onSearchChange?: (value: string) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface MediaPickerCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
}

export interface MediaPickerGridProps {
  items: MediaItem[];
  filteredItems: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
}
