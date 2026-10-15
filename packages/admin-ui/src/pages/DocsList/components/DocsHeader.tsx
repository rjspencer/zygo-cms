import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon, Pencil1Icon } from '@radix-ui/react-icons';

export const DocsHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Docs
        </Heading>
        <Text size="2" color="gray">
          Manage your site's documentation hierarchy
        </Text>
      </Box>
      <Flex gap="2">
        <Button
          variant="outline"
          color="gray"
          onClick={() => navigate('/templates/docs')}
          data-testid="edit-docs-template-btn"
        >
          <Pencil1Icon width="16" height="16" />
          Edit Template &amp; Styles
        </Button>
        <Button variant="solid" color="cyan" onClick={() => navigate('/docs/editor/new')}>
          <PlusIcon width="18" height="18" />
          Create Doc
        </Button>
      </Flex>
    </Flex>
  );
};
