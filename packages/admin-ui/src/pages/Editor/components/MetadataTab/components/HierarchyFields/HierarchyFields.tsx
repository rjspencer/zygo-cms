import React from 'react';
import { Box, Flex, Text, TextField } from '@radix-ui/themes';
import { Controller, useFormContext } from 'react-hook-form';
import type { EntryFormValues } from '../../../../types';

export const HierarchyFields: React.FC = () => {
  const { register, control } = useFormContext<EntryFormValues>();

  return (
    <Flex gap="4">
      <Box style={{ flex: 1 }}>
        <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Parent ID
        </Text>
        <TextField.Root
          size="2"
          placeholder="Leave blank for root"
          {...register('parentId')}
        />
        <Text size="1" color="gray">
          ID of the parent entry
        </Text>
      </Box>
      <Box style={{ flex: 1 }}>
        <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Sort Order
        </Text>
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => (
            <TextField.Root
              type="number"
              size="2"
              value={(field.value ?? 0).toString()}
              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
            />
          )}
        />
        <Text size="1" color="gray">
          Order relative to siblings
        </Text>
      </Box>
    </Flex>
  );
};
