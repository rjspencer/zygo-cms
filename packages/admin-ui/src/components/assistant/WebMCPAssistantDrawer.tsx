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
  TextArea,
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

  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [toolRunnerOutput, setToolRunnerOutput] = useState<string | null>(null);

  const [rpcPayload, setRpcPayload] = useState<string>('');
  const [rpcRunnerOutput, setRpcRunnerOutput] = useState<string | null>(null);

  useEffect(() => {
    const updateState = () => {
      setTools(registry.getTools());
      setActivityLog(registry.getActivityLog());
    };
    updateState();
    const unsubscribe = registry.subscribe(updateState);
    return unsubscribe;
  }, [registry]);

  const handleToggleRunner = (toolName: string) => {
    if (expandedTool === toolName) {
      setExpandedTool(null);
      setToolRunnerOutput(null);
    } else {
      setExpandedTool(toolName);
      setToolArgs('{}');
      setToolRunnerOutput(null);
    }
  };

  const handleExecuteTool = async (toolName: string) => {
    let parsedArgs: Record<string, any> = {};
    try {
      const trimmed = toolArgs.trim();
      parsedArgs = trimmed ? JSON.parse(trimmed) : {};
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToolRunnerOutput(`Invalid JSON: ${msg}`);
      return;
    }

    const res = await registry.callTool(toolName, parsedArgs);
    const outputText = res.content.map((c) => c.text).join('\n');
    setToolRunnerOutput(outputText);
  };

  const handleExecuteRpc = async () => {
    let parsed: any;
    try {
      const trimmed = rpcPayload.trim();
      if (!trimmed) {
        setRpcRunnerOutput('Invalid JSON: Empty payload');
        return;
      }
      parsed = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRpcRunnerOutput(`Invalid JSON: ${msg}`);
      return;
    }

    if (Array.isArray(parsed)) {
      const results: string[] = [];
      for (const item of parsed) {
        const name = item?.name || item?.tool || '';
        const args = item?.arguments || item?.args || {};
        const res = await registry.callTool(name, args);
        results.push(res.content.map((c) => c.text).join('\n'));
      }
      setRpcRunnerOutput(results.join('\n\n'));
    } else if (parsed && typeof parsed === 'object') {
      const name = parsed.name || parsed.tool || '';
      const args = parsed.arguments || parsed.args || {};
      const res = await registry.callTool(name, args);
      setRpcRunnerOutput(res.content.map((c) => c.text).join('\n'));
    } else {
      setRpcRunnerOutput('Invalid JSON: Expected an object or array of tool call objects');
    }
  };

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

        {/* Tabs: Activity Log, Registered Tools & RPC Console */}
        <Tabs.Root defaultValue="activity">
          <Tabs.List mb="3">
            <Tabs.Trigger value="activity">
              Activity Log
            </Tabs.Trigger>
            <Tabs.Trigger value="tools">
              Registered Tools ({tools.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="rpc">
              RPC Console
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
              <Box style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                <Flex direction="column" gap="2">
                  {[...activityLog].reverse().map((entry) => (
                    <Card key={entry.id} size="1" variant="surface" style={{ flexShrink: 0 }}>
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
              </Box>
            )}
          </Tabs.Content>

          <Tabs.Content value="tools">
            <Flex justify="between" align="center" mb="3">
              <Text size="2" color="gray">
                Currently active WebMCP tools ({tools.length})
              </Text>
            </Flex>
            <Box style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              <Flex direction="column" gap="2">
                {tools.map((tool) => (
                  <Card key={tool.name} size="1" variant="surface" style={{ flexShrink: 0 }}>
                  <Flex justify="between" align="start" gap="2">
                    <Box style={{ flex: 1 }}>
                      <Text size="2" weight="bold" color="cyan" as="div" mb="1">
                        {tool.name}
                      </Text>
                      <Text size="2" color="gray" as="div">
                        {tool.description}
                      </Text>
                    </Box>
                    <Button
                      size="1"
                      variant="soft"
                      color="cyan"
                      aria-label={`Run ${tool.name}`}
                      onClick={() => handleToggleRunner(tool.name)}
                    >
                      {expandedTool === tool.name ? 'Hide Runner' : 'Run Tool'}
                    </Button>
                  </Flex>

                  {expandedTool === tool.name && (
                    <Box mt="3" pt="2" style={{ borderTop: '1px solid var(--gray-a4)' }}>
                      <Text size="1" weight="bold" color="gray" as="div" mb="1">
                        Input Schema:
                      </Text>
                      <Box
                        p="2"
                        mb="2"
                        style={{
                          backgroundColor: 'var(--gray-a2)',
                          borderRadius: 'var(--radius-2)',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '100px',
                          overflowY: 'auto',
                        }}
                      >
                        {JSON.stringify(tool.inputSchema)}
                      </Box>

                      <Text size="1" weight="bold" color="gray" as="div" mb="1">
                        Arguments (JSON):
                      </Text>
                      <TextArea
                        aria-label="Tool Arguments JSON"
                        value={toolArgs}
                        onChange={(e) => setToolArgs(e.target.value)}
                        rows={3}
                        mb="2"
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />

                      <Flex justify="end">
                        <Button
                          size="1"
                          variant="solid"
                          color="cyan"
                          onClick={() => handleExecuteTool(tool.name)}
                        >
                          Execute Tool
                        </Button>
                      </Flex>

                      {toolRunnerOutput !== null && (
                        <Box
                          mt="2"
                          p="2"
                          data-testid="tool-runner-output"
                          style={{
                            backgroundColor: 'var(--gray-a2)',
                            borderRadius: 'var(--radius-2)',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '140px',
                            overflowY: 'auto',
                          }}
                        >
                          {toolRunnerOutput}
                        </Box>
                      )}
                    </Box>
                  )}
                </Card>
              ))}
              </Flex>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="rpc">
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                Execute a single tool call or a batch array of tool calls via JSON.
              </Text>
              <TextArea
                aria-label="RPC Payload JSON"
                placeholder='{"name": "editor_add_section", "arguments": {"type_id": "hero", "data": {"heading": "Welcome"}}}'
                value={rpcPayload}
                onChange={(e) => setRpcPayload(e.target.value)}
                rows={5}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
              <Flex justify="end">
                <Button size="1" variant="solid" color="cyan" onClick={handleExecuteRpc}>
                  Execute RPC
                </Button>
              </Flex>
              {rpcRunnerOutput !== null && (
                <Box
                  mt="2"
                  p="2"
                  data-testid="rpc-runner-output"
                  style={{
                    backgroundColor: 'var(--gray-a2)',
                    borderRadius: 'var(--radius-2)',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {rpcRunnerOutput}
                </Box>
              )}
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
