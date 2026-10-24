import React from 'react';
import { Badge, Flex, Text } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import { useFormContext, useWatch } from 'react-hook-form';
import { ENTRY_TYPE_CONFIG } from '../../constants';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';

interface EntryBadgesProps {
  entryType: EntryType;
  isSaved: boolean;
}

export const getStatusBadgeColor = (
  status: EntryStatus
): 'gray' | 'amber' | 'blue' | 'green' | 'red' | 'purple' => {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'in_review':
      return 'amber';
    case 'ready_for_publish':
      return 'blue';
    case 'published':
      return 'green';
    case 'archived':
      return 'red';
    case 'scheduled':
      return 'purple';
    default:
      return 'gray';
  }
};

export const formatStatusLabel = (status: EntryStatus): string => {
  switch (status) {
    case 'in_review':
      return 'IN REVIEW';
    case 'ready_for_publish':
      return 'READY FOR PUBLISH';
    default:
      return status ? status.toUpperCase() : 'DRAFT';
  }
};

export const EntryBadges: React.FC<EntryBadgesProps> = ({ entryType, isSaved }) => {
  const { control } = useFormContext<EntryFormValues>();
  const status = useWatch({ control, name: 'status' }) || 'draft';

  return (
    <Flex align="center" gap="2" mt="2">
      <Badge color={ENTRY_TYPE_CONFIG[entryType].badgeColor}>{entryType.toUpperCase()}</Badge>
      <Badge color={getStatusBadgeColor(status)}>{formatStatusLabel(status)}</Badge>
      {isSaved && (
        <Text size="1" color="green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckIcon /> Saved to Edge
        </Text>
      )}
    </Flex>
  );
};

export default EntryBadges;
