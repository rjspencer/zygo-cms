import type React from 'react';

export interface MediaItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface MediaHeaderProps {
  onUploadClick: () => void;
  onSyncClick: () => void;
  isUploading: boolean;
  isSyncing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface MediaAlertsProps {
  fileError: string | null;
  uploadError: string | null;
  syncError: string | null;
  deleteError: string | null;
}

export interface MediaSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export interface MediaCardProps {
  item: MediaItem;
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export interface MediaGridProps {
  items: MediaItem[];
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}
