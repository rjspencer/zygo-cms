import React from 'react';
import { Card, Heading, Text, Separator, Flex, Badge } from '@radix-ui/themes';

export const EdgeEnvironmentCard: React.FC = () => {
  return (
    <Card size="2">
      <Heading size="3" mb="2">
        Edge Environment
      </Heading>
      <Text size="2" color="gray" mb="3">
        Current worker bindings and Cloudflare runtime environment
      </Text>

      <Separator size="4" mb="3" />

      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Text size="2" weight="medium">
            Admin UI Deployment
          </Text>
          <Badge color="cyan">Cloudflare Pages</Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="2" weight="medium">
            Public Site
          </Text>
          <Badge color="crimson">
            {import.meta.env.VITE_PUBLIC_SITE_URL || 'Not configured'}
          </Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="2" weight="medium">
            Backend Worker
          </Text>
          <Badge color="amber">admin-api-worker</Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="2" weight="medium">
            Database
          </Text>
          <Badge color="green">Cloudflare D1 (SQLite)</Badge>
        </Flex>
      </Flex>
    </Card>
  );
};
