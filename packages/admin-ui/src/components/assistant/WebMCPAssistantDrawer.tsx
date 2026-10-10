import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Flex,
  Box,
  Text,
  Badge,
  Button,
  Switch,
  Card,
  Tabs,
  Separator,
} from '@radix-ui/themes';
import { useWebMCP } from '../../providers/WebMCPProvider';
import type { WebMCPToolDefinition, WebMCPActivityLogEntry } from '../../lib/webmcp/types';

export interface WebMCPAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebMCPAssistantDrawer: React.FC<WebMCPAssistantDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    registry,
    externalBridgeEnabled,
    setExternalBridgeEnabled,
    requireConfirmation,
    setRequireConfirmation,
  } = useWebMCP();

  const [tools, setTools] = useState<WebMCPToolDefinition[]>(() => registry.getTools());
  const [activityLog, setActivityLog] = useState<WebMCPActivityLogEntry[]>(() =>
    registry.getActivityLog()
  );

  useEffect(() => {
    const updateState = () => {
      setTools(registry.getTools());
      setActivityLog(registry.getActivityLog());
    };
    updateState();
    const unsubscribe = registry.subscribe(updateState);
    return unsubscribe;
  }, [registry]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title mb="0">WebMCP Assistant</Dialog.Title>
          <Badge color={externalBridgeEnabled ? 'green' : 'cyan'} variant="soft">
            {externalBridgeEnabled ? 'External Bridge Active' : 'Connected (In-Browser)'}
          </Badge>
        </Flex>
        <Dialog.Description size="1" color="gray" mb="3">
          Inspect registered Model Context Protocol tools, live activity logs, and runtime settings.
        </Dialog.Description>

        {/* Runtime Settings */}
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

        {/* Tabs: Activity Log & Registered Tools */}
        <Tabs.Root defaultValue="activity">
          <Tabs.List mb="3">
            <Tabs.Trigger value="activity">
              Activity Log
            </Tabs.Trigger>
            <Tabs.Trigger value="tools">
              Registered Tools ({tools.length})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="activity">
            <Flex justify="between" align="center" mb="3">
              <Text size="2" color="gray">
                Recent tool invocations ({activityLog.length})
              </Text>
              <Button
                size="1"
                variant="soft"
                color="gray"
                disabled={activityLog.length === 0}
                onClick={() => registry.clearActivityLog()}
              >
                Clear Activity Log
              </Button>
            </Flex>

            {activityLog.length === 0 ? (
              <Card variant="surface" style={{ textAlign: 'center', padding: '24px' }}>
                <Text size="2" color="gray">
                  No recent activity logged.
                </Text>
              </Card>
            ) : (
              <Flex direction="column" gap="2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {[...activityLog].reverse().map((entry) => (
                  <Card key={entry.id} size="1" variant="surface">
                    <Flex justify="between" align="center" mb="1">
                      <Text size="2" weight="bold">
                        {entry.toolName}
                      </Text>
                      <Badge
                        size="1"
                        color={
                          entry.status === 'success'
                            ? 'green'
                            : entry.status === 'error'
                            ? 'red'
                            : 'blue'
                        }
                        variant="soft"
                      >
                        {entry.status}
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" as="div" mb="1">
                      {entry.timestamp}
                    </Text>
                    {entry.resultText && (
                      <Box
                        p="2"
                        style={{
                          backgroundColor: 'var(--gray-a2)',
                          borderRadius: 'var(--radius-2)',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '120px',
                          overflowY: 'auto',
                        }}
                      >
                        {entry.resultText}
                      </Box>
                    )}
                  </Card>
                ))}
              </Flex>
            )}
          </Tabs.Content>

          <Tabs.Content value="tools">
            <Flex justify="between" align="center" mb="3">
              <Text size="2" color="gray">
                Currently active WebMCP tools ({tools.length})
              </Text>
            </Flex>
            <Flex direction="column" gap="2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {tools.map((tool) => (
                <Card key={tool.name} size="1" variant="surface">
                  <Text size="2" weight="bold" color="cyan" as="div" mb="1">
                    {tool.name}
                  </Text>
                  <Text size="2" color="gray" as="div">
                    {tool.description}
                  </Text>
                </Card>
              ))}
            </Flex>
          </Tabs.Content>
        </Tabs.Root>

        <Flex justify="end" mt="4">
          <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default WebMCPAssistantDrawer;
