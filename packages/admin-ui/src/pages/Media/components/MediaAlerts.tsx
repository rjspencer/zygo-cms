import React from 'react';
import { Box, Text } from '@radix-ui/themes';
import type { MediaAlertsProps } from '../types';

export const MediaAlerts: React.FC<MediaAlertsProps> = ({
  fileError,
  uploadError,
  syncError,
  deleteError,
}) => {
  return (
    <>
      {(fileError || uploadError) && (
        <Box mb="4">
          <Text color="red" size="2">
            {fileError || uploadError}
          </Text>
        </Box>
      )}

      {syncError && (
        <Box mb="4">
          <Text color="red" size="2">
            {syncError}
          </Text>
        </Box>
      )}

      {deleteError && (
        <Box mb="4">
          <Text color="red" size="2">
            {deleteError}
          </Text>
        </Box>
      )}
    </>
  );
};
