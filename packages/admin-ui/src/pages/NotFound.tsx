import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Heading, Text, Button } from '@radix-ui/themes';
import { DashboardIcon } from '@radix-ui/react-icons';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: '60vh', textAlign: 'center' }}
    >
      <Heading size="9" weight="bold" color="iris" mb="2">
        404
      </Heading>
      <Heading size="5" mb="2">
        Page Not Found
      </Heading>
      <Text size="2" color="gray" mb="4" style={{ maxWidth: '400px' }}>
        The administrative route you are looking for does not exist or has been moved.
      </Text>
      <Button size="3" variant="solid" color="iris" onClick={() => navigate('/')}>
        <DashboardIcon width="18" height="18" />
        Return to Dashboard
      </Button>
    </Flex>
  );
};

export default NotFound;
