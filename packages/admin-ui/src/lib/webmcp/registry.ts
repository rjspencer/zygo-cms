import {
  WebMCPToolDefinition,
  WebMCPToolResult,
  WebMCPActivityLogEntry,
  BrowserModelContext,
  BrowserModelContextTool,
} from './types';
import { createGlobalRedirectTools } from './redirectTools';
import { createGlobalSubmissionTools } from './submissionTools';

export class WebMCPRegistry {
  private tools = new Map<string, WebMCPToolDefinition>();
  private activityLog: WebMCPActivityLogEntry[] = [];
  private listeners = new Set<() => void>();
  private isBrowserBound = false;
  private syncedTools = new Map<string, { def: WebMCPToolDefinition; synced: BrowserModelContextTool }>();

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

  private toBrowserModelContextTool(tool: WebMCPToolDefinition): BrowserModelContextTool {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: (args: Record<string, any>) => this.callTool(tool.name, args),
      handler: (args: Record<string, any>) => this.callTool(tool.name, args),
    };
  }

  private syncBrowserModelContext(): void {
    if (!this.isBrowserBound || typeof navigator === 'undefined' || !navigator.modelContext) {
      return;
    }

    const mc = navigator.modelContext;
    const addedOrUpdated: BrowserModelContextTool[] = [];
    const removedNames: string[] = [];

    for (const [name, entry] of this.syncedTools.entries()) {
      if (!this.tools.has(name)) {
        this.syncedTools.delete(name);
        removedNames.push(name);
      } else {
        const currentDef = this.tools.get(name)!;
        if (currentDef !== entry.def) {
          const synced = this.toBrowserModelContextTool(currentDef);
          this.syncedTools.set(name, { def: currentDef, synced });
          addedOrUpdated.push(synced);
        }
      }
    }

    for (const [name, def] of this.tools.entries()) {
      if (!this.syncedTools.has(name)) {
        const synced = this.toBrowserModelContextTool(def);
        this.syncedTools.set(name, { def, synced });
        addedOrUpdated.push(synced);
      }
    }

    const allSyncedTools = Array.from(this.syncedTools.values()).map((e) => e.synced);

    if (typeof mc.provideContext === 'function') {
      try {
        mc.provideContext({ tools: allSyncedTools });
      } catch (err) {
        console.error('Error calling navigator.modelContext.provideContext:', err);
      }
    }

    if (typeof mc.unregisterTool === 'function') {
      for (const name of removedNames) {
        try {
          mc.unregisterTool(name);
        } catch (err) {
          console.error(`Error calling navigator.modelContext.unregisterTool for ${name}:`, err);
        }
      }
    }

    if (typeof mc.registerTool === 'function') {
      for (const syncedTool of addedOrUpdated) {
        try {
          mc.registerTool(syncedTool);
        } catch (err) {
          console.error(`Error calling navigator.modelContext.registerTool for ${syncedTool.name}:`, err);
        }
      }
    }
  }

  bindBrowserGlobals(host?: any): () => void {
    this.isBrowserBound = true;
    this.syncedTools.clear();

    if (typeof window !== 'undefined') {
      window.webmcp = {
        callTool: (name: string, args?: Record<string, any>) => this.callTool(name, args),
        executeTool: (name: string, args?: Record<string, any>) => this.callTool(name, args),
        getTools: () => this.getTools(),
        listTools: () => this.getTools(),
        getTool: (name: string) => this.getTool(name),
        getActivityLog: () => this.getActivityLog(),
        registry: this,
        host,
      };
    }

    if (typeof navigator !== 'undefined') {
      if (!navigator.modelContext) {
        const contextTools = new Map<string, any>();
        const polyfill: BrowserModelContext = {
          registerTool: (tool: any) => {
            if (tool && typeof tool.name === 'string') {
              contextTools.set(tool.name, tool);
              return () => {
                contextTools.delete(tool.name);
              };
            }
          },
          unregisterTool: (name: string) => {
            contextTools.delete(name);
          },
          provideContext: (options: { tools: any[] }) => {
            contextTools.clear();
            if (options && Array.isArray(options.tools)) {
              for (const tool of options.tools) {
                if (tool && typeof tool.name === 'string') {
                  contextTools.set(tool.name, tool);
                }
              }
            }
          },
          clearContext: () => {
            contextTools.clear();
          },
          getTools: () => Array.from(contextTools.values()),
          executeTool: async (name: string, args?: Record<string, any>) => {
            if (this.tools.has(name)) {
              return this.callTool(name, args);
            }
            const externalTool = contextTools.get(name);
            if (externalTool) {
              const safeArgs = args && typeof args === 'object' ? args : {};
              if (typeof externalTool.execute === 'function') {
                return externalTool.execute(safeArgs);
              }
              if (typeof externalTool.handler === 'function') {
                return externalTool.handler(safeArgs);
              }
            }
            return this.callTool(name, args);
          },
        };

        try {
          Object.defineProperty(navigator, 'modelContext', {
            value: polyfill,
            configurable: true,
            writable: true,
          });
        } catch {
          (navigator as any).modelContext = polyfill;
        }
      }

      this.syncBrowserModelContext();
    }

    return () => {
      this.isBrowserBound = false;
      if (typeof navigator !== 'undefined' && navigator.modelContext) {
        const mc = navigator.modelContext;
        if (typeof mc.unregisterTool === 'function') {
          for (const name of this.syncedTools.keys()) {
            try {
              mc.unregisterTool(name);
            } catch {
              // ignore cleanup errors
            }
          }
        }
      }
      this.syncedTools.clear();
    };
  }

  registerTool(tool: WebMCPToolDefinition): () => void {
    this.tools.set(tool.name, tool);
    this.syncBrowserModelContext();
    this.notifyListeners();

    return () => {
      const current = this.tools.get(tool.name);
      if (current === tool || current?.handler === tool.handler) {
        this.tools.delete(tool.name);
        this.syncBrowserModelContext();
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
    this.syncBrowserModelContext();
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
        this.syncBrowserModelContext();
        this.notifyListeners();
      }
    };
  }

  unregisterTool(name: string): void {
    if (this.tools.delete(name)) {
      this.syncBrowserModelContext();
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

  registerRedirectTools(): () => void {
    return this.registerTools(createGlobalRedirectTools());
  }

  registerSubmissionTools(): () => void {
    return this.registerTools(createGlobalSubmissionTools());
  }
}

export { createGlobalRedirectTools } from './redirectTools';
export { createGlobalSubmissionTools } from './submissionTools';
