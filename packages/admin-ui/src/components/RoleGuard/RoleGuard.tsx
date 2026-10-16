import React from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import type { RoleGuardProps } from './types';
import { useRoleGuard } from './hooks';

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { role, isLoading } = useRoleGuard();

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ height: '100%' }}>
        <Text>Loading access...</Text>
      </Flex>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <Box p="6">
        <Text color="red" size="5">Access Denied. You do not have permission to view this page.</Text>
      </Box>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
