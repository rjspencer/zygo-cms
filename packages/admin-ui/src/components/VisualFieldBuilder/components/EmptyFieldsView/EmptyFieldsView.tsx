import React from 'react';
import { Box, Text } from '@radix-ui/themes';

export const EmptyFieldsView: React.FC = () => {
  return (
    <Box
      p="4"
      mb="3"
      style={{
        textAlign: 'center',
        border: '1px dashed var(--gray-6)',
        borderRadius: 'var(--radius-3)',
      }}
    >
      <Text size="2" color="gray">
        No fields defined yet. Click &quot;Add Field&quot; below to define template fields.
      </Text>
    </Box>
  );
};

export default EmptyFieldsView;
