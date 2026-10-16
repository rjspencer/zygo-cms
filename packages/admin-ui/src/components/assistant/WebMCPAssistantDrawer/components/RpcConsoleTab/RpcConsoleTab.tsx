import React from 'react';
import { Tabs, Flex, Box, Text, TextArea, Button } from '@radix-ui/themes';
import type { RpcConsoleTabProps } from '../../types';

export const RpcConsoleTab: React.FC<RpcConsoleTabProps> = ({
  rpcPayload,
  rpcRunnerOutput,
  onRpcPayloadChange,
  onExecuteRpc,
}) => {
  return (
    <Tabs.Content value="rpc">
      <Flex direction="column" gap="2">
        <Text size="2" color="gray">
          Execute a single tool call or a batch array of tool calls via JSON.
        </Text>
        <TextArea
          aria-label="RPC Payload JSON"
          placeholder='{"name": "editor_add_section", "arguments": {"type_id": "hero", "data": {"heading": "Welcome"}}}'
          value={rpcPayload}
          onChange={(e) => onRpcPayloadChange(e.target.value)}
          rows={5}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
        <Flex justify="end">
          <Button size="1" variant="solid" color="cyan" onClick={onExecuteRpc}>
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
  );
};

export default RpcConsoleTab;
