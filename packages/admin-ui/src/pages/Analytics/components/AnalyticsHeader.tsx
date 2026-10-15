import React from 'react';
import { Flex, Box, Heading, Text, Badge } from '@radix-ui/themes';
import { ActivityLogIcon } from '@radix-ui/react-icons';

interface AnalyticsHeaderProps {
  isAnalyticsDisabled: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ isAnalyticsDisabled }) => {
  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Analytics &amp; Performance
        </Heading>
        <Text size="2" color="gray">
          Edge performance and Cloudflare analytics metrics
        </Text>
      </Box>
      <Badge size="2" color={isAnalyticsDisabled ? 'gray' : 'green'}>
        {isAnalyticsDisabled ? (
          'Disabled'
        ) : (
          <Flex align="center" gap="1">
            <ActivityLogIcon />
            <span>Real-time Edge</span>
          </Flex>
        )}
      </Badge>
    </Flex>
  );
};
