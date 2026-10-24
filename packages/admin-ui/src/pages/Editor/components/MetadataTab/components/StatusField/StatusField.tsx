import React from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { apiFetch } from '../../../../../../utils/api';
import type { EntryFormValues, EntryStatus } from '../../../../types';

interface StatusFieldProps {
  role?: string;
}

const STATUS_OPTIONS: Array<{
  value: EntryStatus;
  label: string;
  color: 'gray' | 'amber' | 'blue' | 'green' | 'red' | 'purple';
  authorRestricted: boolean;
}> = [
  { value: 'draft', label: 'Draft', color: 'gray', authorRestricted: false },
  { value: 'in_review', label: 'In Review', color: 'amber', authorRestricted: false },
  { value: 'ready_for_publish', label: 'Ready for Publish', color: 'blue', authorRestricted: true },
  { value: 'published', label: 'Published', color: 'green', authorRestricted: true },
  { value: 'archived', label: 'Archived', color: 'red', authorRestricted: true },
];

export const StatusFieldInner: React.FC<StatusFieldProps> = ({ role = 'editor' }) => {
  const { watch, setValue } = useFormContext<EntryFormValues>();
  const status = watch('status') || 'draft';
  const isAuthor = role.toLowerCase() === 'author';

  return (
    <Box>
      <Text as="div" id="editor-status-label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Status
      </Text>
      <Flex gap="2" wrap="wrap" role="group" aria-labelledby="editor-status-label">
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = status === opt.value;
          const isDisabled = isAuthor && opt.authorRestricted;
          return (
            <Button
              key={opt.value}
              type="button"
              size="1"
              variant={isSelected ? 'solid' : 'soft'}
              color={opt.color}
              disabled={isDisabled}
              aria-pressed={isSelected}
              data-testid={`status-btn-${opt.value}`}
              onClick={() => setValue('status', opt.value, { shouldDirty: true })}
            >
              {opt.label}
            </Button>
          );
        })}
        {status === 'scheduled' && (
          <Button
            type="button"
            size="1"
            variant="solid"
            color="purple"
            disabled={isAuthor}
            aria-pressed={true}
            data-testid="status-btn-scheduled"
          >
            Scheduled
          </Button>
        )}
      </Flex>
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
