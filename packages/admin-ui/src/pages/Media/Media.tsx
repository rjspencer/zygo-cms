import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box } from '@radix-ui/themes';
import { MediaHeader, MediaAlerts, MediaSearchBar, MediaGrid } from './components';
import { useMediaData, useMediaFilters, useMediaUpload } from './hooks';

export const Media: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { search, setSearch } = useMediaFilters();

  const handleUploadSuccess = useCallback(() => {
    setSearch('');
  }, [setSearch]);

  const {
    items,
    uploadMutation,
    syncMutation,
    deleteMutation,
  } = useMediaData({
    onUploadSuccess: handleUploadSuccess,
    onUploadSettled: () => resetFileInput(),
  });

  const {
    fileError,
    fileInputRef,
    handleFileUpload,
    resetFileInput,
  } = useMediaUpload({
    onUpload: (file) => uploadMutation.mutate(file),
  });

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') setCopiedId(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const handleCopy = useCallback((id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  return (
    <Box>
      <MediaHeader
        onUploadClick={() => fileInputRef.current?.click()}
        onSyncClick={() => syncMutation.mutate()}
        isUploading={uploadMutation.isPending}
        isSyncing={syncMutation.isPending}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
      />

      <MediaAlerts
        fileError={fileError}
        uploadError={
          uploadMutation.isError
            ? uploadMutation.error?.message || 'Failed to upload media'
            : null
        }
        syncError={
          syncMutation.isError
            ? syncMutation.error?.message || 'Failed to sync media'
            : null
        }
        deleteError={
          deleteMutation.isError
            ? deleteMutation.error?.message || 'Failed to delete media'
            : null
        }
      />

      <MediaSearchBar search={search} onSearchChange={setSearch} />

      <MediaGrid
        items={filteredItems}
        copiedId={copiedId}
        onCopy={handleCopy}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
};

export default Media;
