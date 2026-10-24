import React from 'react';
import { Box, Button, Flex } from '@radix-ui/themes';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import { BackButton } from '../../../../components/BackButton';
import { apiFetch } from '../../../../utils/api';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';
import { EntryBadges } from '../EntryBadges/EntryBadges';
import { TitleEditor } from '../TitleEditor/TitleEditor';

export interface EditorHeaderProps {
  entryType: EntryType;
  isNewEntry: boolean;
  isSaved: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSaveWithStatus?: (status: EntryStatus) => void;
  userRole?: string;
}

export const EditorHeaderInner: React.FC<EditorHeaderProps & { role: string }> = ({
  entryType,
  isNewEntry,
  isSaved,
  onSaveDraft,
  onPublish,
  onSaveWithStatus,
  role,
}) => {
  const { control, setValue } = useFormContext<EntryFormValues>();
  const status = useWatch({ control, name: 'status' }) || 'draft';
  const isAuthor = role.toLowerCase() === 'author';

  const handleSaveDraft = () => {
    setValue('status', 'draft', { shouldDirty: true });
    if (onSaveWithStatus) {
      onSaveWithStatus('draft');
    } else {
      onSaveDraft();
    }
  };

  const handleSubmitReview = () => {
    setValue('status', 'in_review', { shouldDirty: true });
    if (onSaveWithStatus) {
      onSaveWithStatus('in_review');
    } else {
      onSaveDraft();
    }
  };

  const handleMarkReady = () => {
    setValue('status', 'ready_for_publish', { shouldDirty: true });
    if (onSaveWithStatus) {
      onSaveWithStatus('ready_for_publish');
    } else {
      onSaveDraft();
    }
  };

  const handlePublish = () => {
    setValue('status', 'published', { shouldDirty: true });
    if (onSaveWithStatus) {
      onSaveWithStatus('published');
    } else {
      onPublish();
    }
  };

  const handleArchive = () => {
    setValue('status', 'archived', { shouldDirty: true });
    if (onSaveWithStatus) {
      onSaveWithStatus('archived');
    } else {
      onSaveDraft();
    }
  };

  return (
    <>
      <Flex justify="between" align="center" mb="2">
        <BackButton />
        <Flex gap="2" align="center">
          {isAuthor ? (
            <>
              <Button variant="soft" color="gray" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button
                variant="solid"
                color="amber"
                data-testid="editor-submit-review-btn"
                onClick={handleSubmitReview}
              >
                Submit for Review
              </Button>
            </>
          ) : (
            <>
              <Button variant="soft" color="gray" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              {status === 'in_review' && (
                <Button
                  variant="solid"
                  color="blue"
                  data-testid="editor-mark-ready-btn"
                  onClick={handleMarkReady}
                >
                  Mark Ready
                </Button>
              )}
              <Button
                variant="solid"
                color="cyan"
                data-testid="editor-publish-btn"
                onClick={handlePublish}
              >
                Publish
              </Button>
              <Button
                variant="soft"
                color="red"
                data-testid="editor-archive-btn"
                disabled={status === 'archived'}
                onClick={handleArchive}
              >
                Archive
              </Button>
            </>
          )}
        </Flex>
      </Flex>

      <Box mb="5">
        <TitleEditor isNewEntry={isNewEntry} />
        <EntryBadges entryType={entryType} isSaved={isSaved} />
      </Box>
    </>
  );
};

const EditorHeaderWithQuery: React.FC<EditorHeaderProps> = (props) => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const effectiveRole = props.userRole || meData?.role?.toLowerCase() || 'editor';
  return <EditorHeaderInner {...props} role={effectiveRole} />;
};

export const EditorHeader: React.FC<EditorHeaderProps> = (props) => {
  const queryClient = React.useContext(QueryClientContext);
  if (!queryClient) {
    return <EditorHeaderInner {...props} role={props.userRole || 'editor'} />;
  }
  return <EditorHeaderWithQuery {...props} />;
};

export default EditorHeader;
