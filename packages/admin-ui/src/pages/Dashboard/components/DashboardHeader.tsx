import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';

export const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Dashboard
        </Heading>
        <Text size="2" color="gray">
          Overview of your Zygo CMS content and edge operations
        </Text>
      </Box>
      <Flex gap="2">
        <Button variant="solid" color="cyan" onClick={() => navigate('/posts/editor/new')}>
          <PlusIcon width="18" height="18" />
          New Post
        </Button>
      </Flex>
    </Flex>
  );
};
