import React from 'react';
import { Card, Grid, Flex, Box, Text, Heading, Badge } from '@radix-ui/themes';
import type { DashboardMetricItem } from '../types';

interface DashboardMetricsGridProps {
  metrics: DashboardMetricItem[];
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({ metrics }) => {
  return (
    <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="6">
      {metrics.map((m) => (
        <Card key={m.title} size="2">
          <Flex justify="between" align="start">
            <Box>
              <Text size="1" color="gray" weight="medium">
                {m.title}
              </Text>
              <Heading size="6" mt="1">
                {m.value}
              </Heading>
            </Box>
            <Badge color={m.color} variant="soft" size="2">
              {m.icon}
            </Badge>
          </Flex>
        </Card>
      ))}
    </Grid>
  );
};
