import type { WebMCPToolDefinition, WebMCPActivityLogEntry } from '../../../lib/webmcp/types';

export interface WebMCPAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface RuntimeSettingsCardProps {
  externalBridgeEnabled: boolean;
  setExternalBridgeEnabled: (val: boolean) => void;
  requireConfirmation: boolean;
  setRequireConfirmation: (val: boolean) => void;
}

export interface ActivityLogTabProps {
  activityLog: WebMCPActivityLogEntry[];
  onClearActivityLog: () => void;
}

export interface RegisteredToolsTabProps {
  tools: WebMCPToolDefinition[];
  expandedTool: string | null;
  toolArgs: string;
  toolRunnerOutput: string | null;
  onToggleRunner: (toolName: string) => void;
  onToolArgsChange: (args: string) => void;
  onExecuteTool: (toolName: string) => void;
}

export interface RpcConsoleTabProps {
  rpcPayload: string;
  rpcRunnerOutput: string | null;
  onRpcPayloadChange: (payload: string) => void;
  onExecuteRpc: () => void;
}
