import React from 'react';
import { Box, Select, Text } from '@radix-ui/themes';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { apiFetch } from '../../../../../../utils/api';
import type { EntryFormValues, EntryStatus } from '../../../../types';

interface StatusFieldProps {
  role?: string;
}

export const StatusFieldInner: React.FC<StatusFieldProps> = ({ role = 'editor' }) => {
  const { watch, setValue } = useFormContext<EntryFormValues>();
  const status = watch('status') || 'draft';
  const isAuthor = role.toLowerCase() === 'author';

  return (
    <Box>
      <Text as="label" htmlFor="editor-status-select" id="editor-status-label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Status
      </Text>
      <Select.Root
        value={status}
        onValueChange={(val) => setValue('status', val as EntryStatus, { shouldDirty: true })}
      >
        <Select.Trigger
          id="editor-status-select"
          aria-label="Publication status"
          aria-describedby={isAuthor ? 'editor-status-help' : undefined}
        />
        <Select.Content>
          <Select.Item value="draft">Draft</Select.Item>
          <Select.Item value="in_review">In Review</Select.Item>
          <Select.Item value="ready_for_publish" disabled={isAuthor}>
            Ready for Publish
          </Select.Item>
          <Select.Item value="published" disabled={isAuthor}>
            Published
          </Select.Item>
          <Select.Item value="archived" disabled={isAuthor}>
            Archived
          </Select.Item>
          {status === 'scheduled' && (
            <Select.Item value="scheduled" disabled={isAuthor}>
              Scheduled
            </Select.Item>
          )}
        </Select.Content>
      </Select.Root>
      {isAuthor && (
        <Text id="editor-status-help" size="1" color="gray" mt="1" style={{ display: 'block' }}>
          Only editors and admins can approve, publish, or archive entries.
        </Text>
      )}
    </Box>
  );
};

const StatusFieldWithQuery: React.FC<StatusFieldProps> = ({ role: roleProp }) => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const effectiveRole = roleProp || meData?.role?.toLowerCase() || 'editor';
  return <StatusFieldInner role={effectiveRole} />;
};

export const StatusField: React.FC<StatusFieldProps> = ({ role }) => {
  const queryClient = React.useContext(QueryClientContext);
  if (!queryClient) {
    return <StatusFieldInner role={role || 'admin'} />;
  }
  return <StatusFieldWithQuery role={role} />;
};

export default StatusField;
