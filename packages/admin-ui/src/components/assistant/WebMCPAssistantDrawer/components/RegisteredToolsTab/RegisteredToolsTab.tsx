import React from 'react';
import { Tabs, Flex, Box, Text, Button, Card, TextArea } from '@radix-ui/themes';
import type { RegisteredToolsTabProps } from '../../types';

export const RegisteredToolsTab: React.FC<RegisteredToolsTabProps> = ({
  tools,
  expandedTool,
  toolArgs,
  toolRunnerOutput,
  onToggleRunner,
  onToolArgsChange,
  onExecuteTool,
}) => {
  return (
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
                  onClick={() => onToggleRunner(tool.name)}
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
                    onChange={(e) => onToolArgsChange(e.target.value)}
                    rows={3}
                    mb="2"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />

                  <Flex justify="end">
                    <Button
                      size="1"
                      variant="solid"
                      color="cyan"
                      onClick={() => onExecuteTool(tool.name)}
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
  );
};

export default RegisteredToolsTab;
