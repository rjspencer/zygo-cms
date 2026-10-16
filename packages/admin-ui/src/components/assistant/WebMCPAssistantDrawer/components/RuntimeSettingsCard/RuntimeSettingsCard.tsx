import React from 'react';
import { Card, Flex, Box, Text, Switch, Separator } from '@radix-ui/themes';
import type { RuntimeSettingsCardProps } from '../../types';

export const RuntimeSettingsCard: React.FC<RuntimeSettingsCardProps> = ({
  externalBridgeEnabled,
  setExternalBridgeEnabled,
  requireConfirmation,
  setRequireConfirmation,
}) => {
  return (
    <Card variant="surface" mb="4" style={{ backgroundColor: 'var(--gray-a2)' }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" weight="bold" as="div">
              External WebSocket Bridge
            </Text>
            <Text size="1" color="gray" as="div">
              Allow external terminal or MCP clients to connect
            </Text>
          </Box>
          <Switch
            aria-label="Enable External WebSocket Bridge"
            checked={externalBridgeEnabled}
            onCheckedChange={setExternalBridgeEnabled}
          />
        </Flex>
        <Separator size="4" />
        <Flex justify="between" align="center">
          <Box>
            <Text size="2" weight="bold" as="div">
              Require Confirmation for Sensitive Actions
            </Text>
            <Text size="1" color="gray" as="div">
              Require operator confirmation before modifying data
            </Text>
          </Box>
          <Switch
            aria-label="Require Confirmation for Sensitive Actions"
            checked={requireConfirmation}
            onCheckedChange={setRequireConfirmation}
          />
        </Flex>
      </Flex>
    </Card>
  );
};

export default RuntimeSettingsCard;
