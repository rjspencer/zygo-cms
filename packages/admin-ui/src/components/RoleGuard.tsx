import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../utils/api';
import { Box, Flex, Text } from '@radix-ui/themes';

export const RoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { data: meData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ height: '100%' }}>
        <Text>Loading access...</Text>
      </Flex>
    );
  }

  // Fallback to author if not found
  const role = meData?.role?.toLowerCase() || 'author';

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
