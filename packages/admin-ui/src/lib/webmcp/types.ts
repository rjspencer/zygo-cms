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
