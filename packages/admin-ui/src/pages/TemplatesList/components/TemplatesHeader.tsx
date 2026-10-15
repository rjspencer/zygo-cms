import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';

export const TemplatesHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Templates
        </Heading>
        <Text size="2" color="gray">
          Manage section templates, schemas, and MiniJinja rendering layouts
        </Text>
      </Box>
      <Button variant="solid" color="cyan" onClick={() => navigate('/templates/new')}>
        <PlusIcon width="18" height="18" />
        New Template
      </Button>
    </Flex>
  );
};
