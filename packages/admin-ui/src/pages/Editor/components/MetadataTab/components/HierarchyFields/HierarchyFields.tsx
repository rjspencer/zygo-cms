import React from 'react';
import { Box, Flex, Text, TextField } from '@radix-ui/themes';
import { Controller, useFormContext } from 'react-hook-form';
import type { EntryFormValues } from '../../../../types';

export const HierarchyFields: React.FC = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EntryFormValues>();

  return (
    <Flex gap="4">
      <Box style={{ flex: 1 }}>
        <Text as="label" htmlFor="editor-parent-id-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Parent ID
        </Text>
        <TextField.Root
          id="editor-parent-id-input"
          size="2"
          placeholder="Leave blank for root"
          aria-invalid={Boolean(errors.parentId)}
          aria-describedby={errors.parentId ? 'editor-parent-id-error editor-parent-id-help' : 'editor-parent-id-help'}
          {...register('parentId')}
        />
        {errors.parentId?.message && (
          <Text id="editor-parent-id-error" role="alert" size="1" color="red" mt="1" style={{ display: 'block' }}>
            {errors.parentId.message}
          </Text>
        )}
        <Text id="editor-parent-id-help" size="1" color="gray">
          ID of the parent entry
        </Text>
      </Box>
      <Box style={{ flex: 1 }}>
        <Text as="label" htmlFor="editor-sort-order-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Sort Order
        </Text>
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => (
            <TextField.Root
              id="editor-sort-order-input"
              type="number"
              size="2"
              aria-describedby="editor-sort-order-help"
              value={(field.value ?? 0).toString()}
              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
            />
          )}
        />
        <Text id="editor-sort-order-help" size="1" color="gray">
          Order relative to siblings
        </Text>
      </Box>
    </Flex>
  );
};
