import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Box, Heading, Text, Button, Link } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';

export const TemplatesHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Flex align="baseline" gap="3">
          <Heading size="6" weight="bold">
            Templates
          </Heading>
          <Link
            href="/theme-preview"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
            weight="medium"
            data-testid="templates-preview-link"
            aria-label="Preview all templates on the public site (opens in new tab)"
          >
            Preview
          </Link>
        </Flex>
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
