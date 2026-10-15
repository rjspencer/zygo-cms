import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';

export interface SettingsHeaderProps {
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
  isDirty: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  onSave,
  isSaving,
  isSaved,
  isDirty,
}) => {
  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Site Settings
        </Heading>
        <Text size="2" color="gray">
          Configure global website and edge deployment parameters
        </Text>
      </Box>
      <Button
        variant="solid"
        color="cyan"
        onClick={onSave}
        disabled={!isDirty || isSaving}
      >
        {isSaved ? (
          <>
            <CheckIcon width="18" height="18" /> Saved!
          </>
        ) : isSaving ? (
          'Saving...'
        ) : (
          'Save Settings'
        )}
      </Button>
    </Flex>
  );
};
