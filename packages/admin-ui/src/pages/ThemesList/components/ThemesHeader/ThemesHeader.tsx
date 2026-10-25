import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon, ColorWheelIcon } from '@radix-ui/react-icons';
import type { ThemesHeaderProps } from '../../types';

export const ThemesHeader: React.FC<ThemesHeaderProps> = ({ onCreateClick }) => {
  return (
    <Flex justify="between" align="start" mb="5" wrap="wrap" gap="3">
      <Box>
        <Flex align="center" gap="2">
          <ColorWheelIcon width="24" height="24" style={{ color: 'var(--cyan-9)' }} />
          <Heading size="6" weight="bold">
            Themes
          </Heading>
        </Flex>
        <Text size="2" color="gray" mt="1" as="div">
          Manage and customize public site themes, pair light and dark modes, and create custom themes.
        </Text>
      </Box>
      <Button variant="solid" color="cyan" onClick={onCreateClick}>
        <PlusIcon width="16" height="16" />
        Create Theme
      </Button>
    </Flex>
  );
};

export default ThemesHeader;
