import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import type { NavigationHeaderProps } from '../types';

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onSave,
  isSaving,
  isSaved,
  disabled,
}) => {
  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Navigation Menus
        </Heading>
        <Text size="2" color="gray">
          Configure site header and footer menu structures
        </Text>
      </Box>
      <Button
        variant="solid"
        color="cyan"
        onClick={onSave}
        disabled={disabled || isSaving}
      >
        {isSaved ? (
          <>
            <CheckIcon width="18" height="18" /> Saved!
          </>
        ) : isSaving ? (
          'Saving...'
        ) : (
          'Save Changes'
        )}
      </Button>
    </Flex>
  );
};
