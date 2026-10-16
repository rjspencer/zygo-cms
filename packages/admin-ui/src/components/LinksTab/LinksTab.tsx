import React from 'react';
import { Flex, Box, Text } from '@radix-ui/themes';
import { useLinksTabData } from './hooks';
import { CanonicalUrlCard, CreateLinkDialog, TrackableLinksTable } from './components';
import type { LinksTabProps } from './types';

export const LinksTab: React.FC<LinksTabProps> = ({ entryId, baseCanonicalUrl, isSaved }) => {
  const {
    links,
    isLoading,
    isCreateOpen,
    setIsCreateOpen,
    copiedLink,
    handleCopy,
    absoluteCanonicalUrl,
    constructFullUrl,
    handleCreate,
    handleDelete,
    isCreating,
    isDeleting,
  } = useLinksTabData({ entryId, baseCanonicalUrl });

  if (!entryId || entryId === 'new' || !isSaved) {
    return (
      <Box p="4" style={{ background: 'var(--gray-3)', borderRadius: '8px' }}>
        <Text color="gray">
          Please save the entry first before generating trackable links.
        </Text>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap="5">
      <CanonicalUrlCard
        absoluteCanonicalUrl={absoluteCanonicalUrl}
        copiedLink={copiedLink}
        onCopy={handleCopy}
      />

      <Box>
        <Flex justify="between" align="center" mb="3">
          <Text size="3" weight="bold">Trackable Links</Text>
          <CreateLinkDialog
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSubmit={handleCreate}
            isSubmitting={isCreating}
          />
        </Flex>

        <TrackableLinksTable
          links={links}
          isLoading={isLoading}
          copiedLink={copiedLink}
          onCopy={handleCopy}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          constructFullUrl={constructFullUrl}
        />
      </Box>
    </Flex>
  );
};

export default LinksTab;
