import { useState, useEffect } from 'react';
import { useWebMCP } from '../../../../providers/WebMCPProvider';
import type { WebMCPToolDefinition, WebMCPActivityLogEntry } from '../../../../lib/webmcp/types';

export function useAssistantDrawer() {
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

  const clearActivityLog = () => {
    registry.clearActivityLog();
  };

  return {
    registry,
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
  };
}

export default useAssistantDrawer;
