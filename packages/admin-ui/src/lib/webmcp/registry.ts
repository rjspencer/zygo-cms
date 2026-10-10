import {
  WebMCPToolDefinition,
  WebMCPToolResult,
  WebMCPActivityLogEntry,
} from './types';

export class WebMCPRegistry {
  private tools = new Map<string, WebMCPToolDefinition>();
  private activityLog: WebMCPActivityLogEntry[] = [];
  private listeners = new Set<() => void>();

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in WebMCPRegistry listener:', err);
      }
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  registerTool(tool: WebMCPToolDefinition): () => void {
    this.tools.set(tool.name, tool);
    this.notifyListeners();

    return () => {
      const current = this.tools.get(tool.name);
      if (current === tool || current?.handler === tool.handler) {
        this.tools.delete(tool.name);
        this.notifyListeners();
      }
    };
  }

  registerTools(tools: WebMCPToolDefinition[]): () => void {
    if (tools.length === 0) {
      return () => {};
    }
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    this.notifyListeners();

    return () => {
      let changed = false;
      for (const tool of tools) {
        const current = this.tools.get(tool.name);
        if (current === tool || current?.handler === tool.handler) {
          this.tools.delete(tool.name);
          changed = true;
        }
      }
      if (changed) {
        this.notifyListeners();
      }
    };
  }

  unregisterTool(name: string): void {
    if (this.tools.delete(name)) {
      this.notifyListeners();
    }
  }

  getTools(): WebMCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): WebMCPToolDefinition | undefined {
    return this.tools.get(name);
  }

  async callTool(name: string, args?: Record<string, any>): Promise<WebMCPToolResult> {
    const safeArgs = (args && typeof args === 'object') ? args : {};
    const tool = this.tools.get(name);

    if (!tool) {
      const errorText = `Unknown tool: ${name}`;
      const logEntry: WebMCPActivityLogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        toolName: name,
        args: safeArgs,
        status: 'error',
        resultText: errorText,
      };
      this.activityLog.push(logEntry);
      this.notifyListeners();
      return {
        isError: true,
        content: [{ type: 'text', text: errorText }],
      };
    }

    const logEntry: WebMCPActivityLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      toolName: name,
      args: safeArgs,
      status: 'running',
    };
    this.activityLog.push(logEntry);
    this.notifyListeners();

    try {
      const result = await tool.handler(safeArgs);
      const isErr = Boolean(result?.isError);
      logEntry.status = isErr ? 'error' : 'success';

      let normalizedContent = Array.isArray(result?.content) ? result.content : [];
      if (normalizedContent.length === 0) {
        let fallbackText = '';
        if (typeof result?.toolResult !== 'undefined') {
          fallbackText = typeof result.toolResult === 'string'
            ? result.toolResult
            : JSON.stringify(result.toolResult);
        } else if (result && typeof result === 'object') {
          fallbackText = isErr ? 'Tool reported error' : 'Success';
        } else if (result != null) {
          fallbackText = String(result);
        } else {
          fallbackText = isErr ? 'Tool reported error' : 'Success';
        }
        normalizedContent = [{ type: 'text', text: fallbackText }];
      }

      logEntry.resultText =
        normalizedContent.map((c) => c.text).join('\n') || (isErr ? 'Tool reported error' : 'Success');
      this.notifyListeners();

      const normalizedResult: WebMCPToolResult = {
        ...(result && typeof result === 'object' ? result : {}),
        isError: isErr,
        content: normalizedContent,
      };

      return normalizedResult;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const resultText = `Error executing ${name}: ${errorMsg}`;
      logEntry.status = 'error';
      logEntry.resultText = resultText;
      this.notifyListeners();
      return {
        isError: true,
        content: [{ type: 'text', text: resultText }],
      };
    }
  }

  getActivityLog(): WebMCPActivityLogEntry[] {
    return [...this.activityLog];
  }

  clearActivityLog(): void {
    this.activityLog = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
