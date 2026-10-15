import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

export interface PagesHeaderProps {
  onCreatePage?: () => void;
}

export const PagesHeader: React.FC<PagesHeaderProps> = ({ onCreatePage }) => {
  const navigate = useNavigate();

  const handleCreate = () => {
    if (onCreatePage) {
      onCreatePage();
    } else {
      navigate('/pages/editor/new');
    }
  };

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Pages
        </Heading>
        <Text size="2" color="gray">
          Manage static and landing pages for your site
        </Text>
      </Box>
      <Button variant="solid" color="cyan" onClick={handleCreate}>
        <PlusIcon width="18" height="18" />
        Create Page
      </Button>
    </Flex>
  );
};

export default PagesHeader;
