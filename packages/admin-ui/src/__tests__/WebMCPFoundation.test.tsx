import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPServerHost } from '../lib/webmcp/server';
import { createMessagePortPair } from '../lib/webmcp/transports';
import {
  WebMCPProvider,
  useWebMCP,
  useRegisterWebMCPTools,
} from '../providers/WebMCPProvider';
import { WebMCPToolDefinition } from '../lib/webmcp/types';

describe('WebMCP Foundation', () => {
  describe('WebMCPRegistry', () => {
    it('registers and retrieves tools', () => {
      const registry = new WebMCPRegistry();
      const tool: WebMCPToolDefinition = {
        name: 'echo',
        description: 'Echo back input',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        handler: (args) => ({
          content: [{ type: 'text', text: `Echo: ${args.message}` }],
        }),
      };

      const cleanup = registry.registerTool(tool);
      expect(registry.getTools()).toHaveLength(1);
      expect(registry.getTool('echo')).toBe(tool);

      cleanup();
      expect(registry.getTools()).toHaveLength(0);
      expect(registry.getTool('echo')).toBeUndefined();
    });

    it('registers multiple tools with a single cleanup function', () => {
      const registry = new WebMCPRegistry();
      const tool1: WebMCPToolDefinition = {
        name: 't1',
        description: 'tool 1',
        inputSchema: { type: 'object' },
        handler: () => ({ content: [{ type: 'text', text: '1' }] }),
      };
      const tool2: WebMCPToolDefinition = {
        name: 't2',
        description: 'tool 2',
        inputSchema: { type: 'object' },
        handler: () => ({ content: [{ type: 'text', text: '2' }] }),
      };

      const cleanup = registry.registerTools([tool1, tool2]);
      expect(registry.getTools()).toHaveLength(2);

      cleanup();
      expect(registry.getTools()).toHaveLength(0);
    });

    it('calls tools successfully and records activity log', async () => {
      const registry = new WebMCPRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.registerTool({
        name: 'greet',
        description: 'Greet someone',
        inputSchema: { type: 'object' },
        handler: (args) => ({
          toolResult: { greeted: args.name },
          content: [{ type: 'text', text: `Hello, ${args.name}!` }],
        }),
      });

      const res = await registry.callTool('greet', { name: 'Alice' });
      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toBe('Hello, Alice!');
      expect(res.toolResult).toEqual({ greeted: 'Alice' });

      const log = registry.getActivityLog();
      expect(log).toHaveLength(1);
      expect(log[0].toolName).toBe('greet');
      expect(log[0].status).toBe('success');
      expect(log[0].resultText).toBe('Hello, Alice!');
      expect(listener).toHaveBeenCalled();

      registry.clearActivityLog();
      expect(registry.getActivityLog()).toHaveLength(0);
    });

    it('handles unknown tool calls gracefully with error in activity log', async () => {
      const registry = new WebMCPRegistry();
      const res = await registry.callTool('non_existent', { a: 1 });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Unknown tool: non_existent');

      const log = registry.getActivityLog();
      expect(log).toHaveLength(1);
      expect(log[0].toolName).toBe('non_existent');
      expect(log[0].status).toBe('error');
    });

    it('handles tool handler exceptions and records error in log', async () => {
      const registry = new WebMCPRegistry();
      registry.registerTool({
        name: 'failing_tool',
        description: 'Fails intentionally',
        inputSchema: { type: 'object' },
        handler: () => {
          throw new Error('Database connection failed');
        },
      });

      const res = await registry.callTool('failing_tool');
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Database connection failed');

      const log = registry.getActivityLog();
      expect(log).toHaveLength(1);
      expect(log[0].status).toBe('error');
      expect(log[0].resultText).toContain('Database connection failed');
    });

    it('does not unregister a tool if it was overwritten by a new version', () => {
      const registry = new WebMCPRegistry();
      const toolV1: WebMCPToolDefinition = {
        name: 'versioned',
        description: 'v1',
        inputSchema: { type: 'object' },
        handler: () => ({ content: [{ type: 'text', text: 'v1' }] }),
      };
      const toolV2: WebMCPToolDefinition = {
        name: 'versioned',
        description: 'v2',
        inputSchema: { type: 'object' },
        handler: () => ({ content: [{ type: 'text', text: 'v2' }] }),
      };

      const cleanupV1 = registry.registerTool(toolV1);
      const cleanupV2 = registry.registerTool(toolV2);

      // Cleaning up V1 should not remove V2
      cleanupV1();
      expect(registry.getTool('versioned')).toBe(toolV2);

      cleanupV2();
      expect(registry.getTool('versioned')).toBeUndefined();
    });
  });

  describe('WebMCPServerHost and Transports', () => {
    it('creates an in-memory client and executes tools via MCP protocol', async () => {
      const registry = new WebMCPRegistry();
      registry.registerTool({
        name: 'add_numbers',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
        handler: (args) => {
          const sum = Number(args.a) + Number(args.b);
          return {
            toolResult: { sum },
            content: [{ type: 'text', text: `Sum is ${sum}` }],
          };
        },
      });

      const host = new WebMCPServerHost(registry);
      const { client, close } = await host.createInMemoryClient();

      const toolsResult = await client.listTools();
      expect(toolsResult.tools).toHaveLength(1);
      expect(toolsResult.tools[0].name).toBe('add_numbers');
      expect(toolsResult.tools[0].description).toBe('Add two numbers');

      const callResult = await client.callTool({
        name: 'add_numbers',
        arguments: { a: 15, b: 27 },
      });

      expect(callResult.content).toBeDefined();
      const textBlock = (callResult.content as Array<{ type: 'text'; text: string }>)[0];
      expect(textBlock.text).toBe('Sum is 42');

      await close();
    });

    it('connects via MessagePortMCPTransport pair and executes tools', async () => {
      const registry = new WebMCPRegistry();
      registry.registerTool({
        name: 'ping',
        description: 'Ping tool',
        inputSchema: { type: 'object' },
        handler: () => ({
          content: [{ type: 'text', text: 'pong' }],
        }),
      });

      const host = new WebMCPServerHost(registry);
      const [clientTransport, serverTransport] = createMessagePortPair();

      const server = await host.connectTransport(serverTransport);
      const client = new Client(
        { name: 'messageport-test-client', version: '1.0.0' },
        { capabilities: {} }
      );
      await client.connect(clientTransport);

      const toolsResult = await client.listTools();
      expect(toolsResult.tools.some((t) => t.name === 'ping')).toBe(true);

      const callResult = await client.callTool({
        name: 'ping',
        arguments: {},
      });

      const textBlock = (callResult.content as Array<{ type: 'text'; text: string }>)[0];
      expect(textBlock.text).toBe('pong');

      await client.close();
      await server.close();
    });
  });

  describe('WebMCPProvider and React integration', () => {
    it('registers global tools (get_current_view, navigate_to, get_system_info)', async () => {
      let contextRegistry!: WebMCPRegistry;

      const TestConsumer = () => {
        const { registry } = useWebMCP();
        contextRegistry = registry;
        return <div data-testid="consumer">Consumer Active</div>;
      };

      render(
        <MemoryRouter initialEntries={['/admin/posts?filter=active#page2']}>
          <WebMCPProvider>
            <TestConsumer />
          </WebMCPProvider>
        </MemoryRouter>
      );

      expect(contextRegistry).toBeDefined();
      const toolNames = contextRegistry.getTools().map((t) => t.name);
      expect(toolNames).toContain('navigate_to');
      expect(toolNames).toContain('get_current_view');
      expect(toolNames).toContain('get_system_info');

      // Test get_current_view
      const viewResult = await contextRegistry.callTool('get_current_view');
      expect(viewResult.toolResult).toEqual({
        pathname: '/admin/posts',
        search: '?filter=active',
        hash: '#page2',
      });

      // Test navigate_to
      const navResult = await act(async () => {
        return await contextRegistry.callTool('navigate_to', { path: '/admin/settings' });
      });
      expect(navResult.toolResult).toEqual({ path: '/admin/settings' });

      // Verify current view updated
      const updatedView = await contextRegistry.callTool('get_current_view');
      expect(updatedView.toolResult).toEqual({
        pathname: '/admin/settings',
        search: '',
        hash: '',
      });

      // Test get_system_info
      const sysInfoResult = await contextRegistry.callTool('get_system_info');
      expect((sysInfoResult.toolResult as any).server).toBe('zygo-cms-webmcp');
      expect((sysInfoResult.toolResult as any).version).toBe('1.0.0');
      expect((sysInfoResult.toolResult as any).currentPath).toBe('/admin/settings');
    });

    it('registers and unregisters component-level tools using useRegisterWebMCPTools', async () => {
      let contextRegistry!: WebMCPRegistry;

      const ToolProviderConsumer = () => {
        const { registry } = useWebMCP();
        contextRegistry = registry;
        return null;
      };

      const DynamicToolComponent: React.FC<{ active: boolean }> = ({ active }) => {
        useRegisterWebMCPTools(
          active
            ? [
                {
                  name: 'dynamic_tool',
                  description: 'Dynamic component tool',
                  inputSchema: { type: 'object' },
                  handler: () => ({
                    content: [{ type: 'text', text: 'Dynamic tool invoked' }],
                  }),
                },
              ]
            : [],
          [active]
        );
        return <div>Dynamic Component</div>;
      };

      const { rerender, unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <WebMCPProvider>
            <ToolProviderConsumer />
            <DynamicToolComponent active={true} />
          </WebMCPProvider>
        </MemoryRouter>
      );

      expect(contextRegistry.getTool('dynamic_tool')).toBeDefined();
      const callRes = await contextRegistry.callTool('dynamic_tool');
      expect(callRes.content[0].text).toBe('Dynamic tool invoked');

      // Rerender with active = false cleans up dynamic_tool
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <WebMCPProvider>
            <ToolProviderConsumer />
            <DynamicToolComponent active={false} />
          </WebMCPProvider>
        </MemoryRouter>
      );

      expect(contextRegistry.getTool('dynamic_tool')).toBeUndefined();

      // Rerender with active = true
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <WebMCPProvider>
            <ToolProviderConsumer />
            <DynamicToolComponent active={true} />
          </WebMCPProvider>
        </MemoryRouter>
      );
      expect(contextRegistry.getTool('dynamic_tool')).toBeDefined();

      // Unmounting clears registered tools from provider
      unmount();
      expect(contextRegistry.getTool('dynamic_tool')).toBeUndefined();
    });

    it('provides fallback registry when useWebMCP is used outside WebMCPProvider', () => {
      let capturedRegistry: WebMCPRegistry | undefined;
      const IsolatedComponent = () => {
        const { registry } = useWebMCP();
        capturedRegistry = registry;
        return <div>Isolated</div>;
      };

      render(<IsolatedComponent />);
      expect(capturedRegistry).toBeDefined();
      expect(capturedRegistry?.getTools()).toBeDefined();
    });
  });

  describe('Browser Global Bridges (window.webmcp & navigator.modelContext)', () => {
    it('attaches window.webmcp on WebMCPProvider mount and executes tools with activity logging', async () => {
      const registry = new WebMCPRegistry();

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <WebMCPProvider registry={registry}>
            <div>App Mounted</div>
          </WebMCPProvider>
        </MemoryRouter>
      );

      const win = window as any;
      expect(win.webmcp).toBeDefined();
      expect(typeof win.webmcp.callTool).toBe('function');
      expect(typeof win.webmcp.executeTool).toBe('function');
      expect(typeof win.webmcp.getTools).toBe('function');
      expect(typeof win.webmcp.listTools).toBe('function');
      expect(typeof win.webmcp.getTool).toBe('function');
      expect(typeof win.webmcp.getActivityLog).toBe('function');
      expect(win.webmcp.registry).toBe(registry);

      expect(win.webmcp.getTools().length).toBeGreaterThanOrEqual(3);
      expect(win.webmcp.listTools().length).toBeGreaterThanOrEqual(3);
      expect(win.webmcp.getTool('get_system_info')).toBeDefined();

      const res1 = await win.webmcp.callTool('get_system_info', {});
      expect(res1.isError).toBeFalsy();
      expect((res1.toolResult as any).server).toBe('zygo-cms-webmcp');

      const res2 = await win.webmcp.executeTool('get_system_info', {});
      expect(res2.isError).toBeFalsy();

      const log = win.webmcp.getActivityLog();
      expect(log.length).toBeGreaterThanOrEqual(2);
      expect(log.some((entry: any) => entry.toolName === 'get_system_info' && entry.status === 'success')).toBe(true);
    });

    it('defines and syncs navigator.modelContext with registered tools and routes execution through WebMCPRegistry', async () => {
      const registry = new WebMCPRegistry();

      const DynamicToolComp: React.FC = () => {
        useRegisterWebMCPTools(
          [
            {
              name: 'dynamic_tool',
              description: 'Dynamic tool for navigator.modelContext test',
              inputSchema: { type: 'object' },
              handler: () => ({
                toolResult: { ok: true },
                content: [{ type: 'text', text: 'Dynamic executed' }],
              }),
            },
          ],
          []
        );
        return <div>Dynamic Mounted</div>;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <WebMCPProvider registry={registry}>
            <DynamicToolComp />
          </WebMCPProvider>
        </MemoryRouter>
      );

      const nav = navigator as any;
      expect(nav.modelContext).toBeDefined();
      expect(typeof nav.modelContext.getTools).toBe('function');
      expect(typeof nav.modelContext.executeTool).toBe('function');

      const mcTools = nav.modelContext.getTools();
      const mcToolNames = mcTools.map((t: any) => t.name);
      expect(mcToolNames).toContain('get_system_info');
      expect(mcToolNames).toContain('navigate_to');
      expect(mcToolNames).toContain('dynamic_tool');

      // Execute via navigator.modelContext.executeTool
      const execRes = await nav.modelContext.executeTool('dynamic_tool', {});
      expect(execRes.isError).toBeFalsy();
      expect(execRes.content[0].text).toBe('Dynamic executed');

      // Execute via tool.execute({}) from navigator.modelContext.getTools()
      const dynamicMcTool = mcTools.find((t: any) => t.name === 'dynamic_tool');
      expect(dynamicMcTool).toBeDefined();
      expect(typeof dynamicMcTool.execute).toBe('function');
      const directRes = await dynamicMcTool.execute({});
      expect(directRes.isError).toBeFalsy();
      expect(directRes.content[0].text).toBe('Dynamic executed');

      const log = registry.getActivityLog();
      expect(log.filter((e) => e.toolName === 'dynamic_tool' && e.status === 'success')).toHaveLength(2);
    });

    it('invokes pre-existing navigator.modelContext registerTool, unregisterTool, and provideContext spies when bound', () => {
      const registerToolSpy = vi.fn();
      const unregisterToolSpy = vi.fn();
      const provideContextSpy = vi.fn();

      const originalModelContext = (navigator as any).modelContext;
      Object.defineProperty(navigator, 'modelContext', {
        value: {
          registerTool: registerToolSpy,
          unregisterTool: unregisterToolSpy,
          provideContext: provideContextSpy,
        },
        configurable: true,
        writable: true,
      });

      try {
        const registry = new WebMCPRegistry();
        const unbind = (registry as any).bindBrowserGlobals();

        const cleanup = registry.registerTool({
          name: 'spy_test_tool',
          description: 'Tool for spy test',
          inputSchema: { type: 'object' },
          handler: () => ({ content: [{ type: 'text', text: 'ok' }] }),
        });

        expect(
          registerToolSpy.mock.calls.length > 0 || provideContextSpy.mock.calls.length > 0
        ).toBe(true);

        cleanup();

        expect(
          unregisterToolSpy.mock.calls.length > 0 || provideContextSpy.mock.calls.length > 0
        ).toBe(true);

        if (typeof unbind === 'function') {
          unbind();
        }
      } finally {
        Object.defineProperty(navigator, 'modelContext', {
          value: originalModelContext,
          configurable: true,
          writable: true,
        });
      }
    });
  });
});

