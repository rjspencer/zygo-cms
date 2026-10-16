import React from 'react';
import { Dialog, Flex, Badge, Button, Tabs } from '@radix-ui/themes';
import { useAssistantDrawer } from './hooks/useAssistantDrawer';
import { RuntimeSettingsCard } from './components/RuntimeSettingsCard';
import { ActivityLogTab } from './components/ActivityLogTab';
import { RegisteredToolsTab } from './components/RegisteredToolsTab';
import { RpcConsoleTab } from './components/RpcConsoleTab';
import type { WebMCPAssistantDrawerProps } from './types';

export const WebMCPAssistantDrawer: React.FC<WebMCPAssistantDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    externalBridgeEnabled,
    setExternalBridgeEnabled,
    requireConfirmation,
    setRequireConfirmation,
    tools,
    activityLog,
    expandedTool,
    toolArgs,
    setToolArgs,
    toolRunnerOutput,
    rpcPayload,
    setRpcPayload,
    rpcRunnerOutput,
    handleToggleRunner,
    handleExecuteTool,
    handleExecuteRpc,
    clearActivityLog,
  } = useAssistantDrawer();

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

        <RuntimeSettingsCard
          externalBridgeEnabled={externalBridgeEnabled}
          setExternalBridgeEnabled={setExternalBridgeEnabled}
          requireConfirmation={requireConfirmation}
          setRequireConfirmation={setRequireConfirmation}
        />

        <Tabs.Root defaultValue="activity">
          <Tabs.List mb="3">
            <Tabs.Trigger value="activity">Activity Log</Tabs.Trigger>
            <Tabs.Trigger value="tools">Registered Tools ({tools.length})</Tabs.Trigger>
            <Tabs.Trigger value="rpc">RPC Console</Tabs.Trigger>
          </Tabs.List>

          <ActivityLogTab
            activityLog={activityLog}
            onClearActivityLog={clearActivityLog}
          />

          <RegisteredToolsTab
            tools={tools}
            expandedTool={expandedTool}
            toolArgs={toolArgs}
            toolRunnerOutput={toolRunnerOutput}
            onToggleRunner={handleToggleRunner}
            onToolArgsChange={setToolArgs}
            onExecuteTool={handleExecuteTool}
          />

          <RpcConsoleTab
            rpcPayload={rpcPayload}
            rpcRunnerOutput={rpcRunnerOutput}
            onRpcPayloadChange={setRpcPayload}
            onExecuteRpc={handleExecuteRpc}
          />
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
