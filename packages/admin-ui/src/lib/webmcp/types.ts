export interface WebMCPToolInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface WebMCPToolContent {
  type: 'text';
  text: string;
}

export interface WebMCPToolResult {
  toolResult?: unknown;
  isError?: boolean;
  content: WebMCPToolContent[];
  [key: string]: unknown;
}

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: WebMCPToolInputSchema;
  handler: (args: Record<string, any>) => Promise<WebMCPToolResult> | WebMCPToolResult;
}

export interface WebMCPActivityLogEntry {
  id: string;
  timestamp: string;
  toolName: string;
  args: Record<string, any>;
  status: 'running' | 'success' | 'error';
  resultText?: string;
}

export interface WebMCPGlobalBridge {
  callTool: (name: string, args?: Record<string, any>) => Promise<WebMCPToolResult>;
  executeTool: (name: string, args?: Record<string, any>) => Promise<WebMCPToolResult>;
  getTools: () => WebMCPToolDefinition[];
  listTools: () => WebMCPToolDefinition[];
  getTool: (name: string) => WebMCPToolDefinition | undefined;
  getActivityLog: () => WebMCPActivityLogEntry[];
  registry: any;
  host?: any;
}

export interface BrowserModelContextTool {
  name: string;
  description: string;
  inputSchema: WebMCPToolInputSchema;
  execute: (args: Record<string, any>) => Promise<WebMCPToolResult>;
  handler: (args: Record<string, any>) => Promise<WebMCPToolResult>;
}

export interface BrowserModelContext {
  registerTool: (tool: any) => void | Promise<void> | (() => void);
  unregisterTool?: (name: string) => void | Promise<void>;
  provideContext?: (options: { tools: any[] }) => void | Promise<void>;
  clearContext?: () => void | Promise<void>;
  getTools?: () => any[];
  executeTool?: (name: string, args?: Record<string, any>) => Promise<WebMCPToolResult>;
}

declare global {
  interface Window {
    webmcp?: WebMCPGlobalBridge;
  }

  interface Navigator {
    modelContext?: BrowserModelContext;
  }
}

