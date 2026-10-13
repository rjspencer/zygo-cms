import React from 'react';
import { Badge, Flex, Text } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import { useFormContext, useWatch } from 'react-hook-form';
import { ENTRY_TYPE_CONFIG } from '../../constants';
import type { EntryFormValues, EntryType } from '../../types';

interface EntryBadgesProps {
  entryType: EntryType;
  isSaved: boolean;
}

export const EntryBadges: React.FC<EntryBadgesProps> = ({ entryType, isSaved }) => {
  const { control } = useFormContext<EntryFormValues>();
  const status = useWatch({ control, name: 'status' });

  return (
    <Flex align="center" gap="2" mt="2">
      <Badge color={ENTRY_TYPE_CONFIG[entryType].badgeColor}>{entryType.toUpperCase()}</Badge>
      <Badge color={status === 'published' ? 'green' : 'gray'}>{status.toUpperCase()}</Badge>
      {isSaved && (
        <Text size="1" color="green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckIcon /> Saved to Edge
        </Text>
      )}
    </Flex>
  );
};
