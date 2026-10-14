import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';

interface UsersHeaderProps {
  onInviteClick: () => void;
}

export const UsersHeader: React.FC<UsersHeaderProps> = ({ onInviteClick }) => {
  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Users
        </Heading>
        <Text size="2" color="gray">
          Manage user accounts, roles, and profiles
        </Text>
      </Box>
      <Button variant="solid" color="cyan" onClick={onInviteClick}>
        <PlusIcon width="18" height="18" />
        Invite User
      </Button>
    </Flex>
  );
};
