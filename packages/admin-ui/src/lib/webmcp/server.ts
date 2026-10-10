import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { InMemoryTransport } from './transports';
import { WebMCPRegistry } from './registry';

export class WebMCPServerHost {
  private registry: WebMCPRegistry;

  constructor(registry?: WebMCPRegistry) {
    this.registry = registry ?? new WebMCPRegistry();
  }

  getRegistry(): WebMCPRegistry {
    return this.registry;
  }

  createServerInstance(): Server {
    const server = new Server(
      { name: 'zygo-cms-webmcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.registry.getTools().map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as any,
        })),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const res = await this.registry.callTool(
        request.params.name,
        (request.params.arguments as Record<string, any>) ?? {}
      );
      return res as any;
    });

    return server;
  }

  async connectTransport(transport: Transport): Promise<Server> {
    const server = this.createServerInstance();
    await server.connect(transport);
    return server;
  }

  async createInMemoryClient(): Promise<{ client: Client; close: () => Promise<void> }> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = await this.connectTransport(serverTransport);
    const client = new Client(
      { name: 'zygo-cms-webmcp-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(clientTransport);
    return {
      client,
      close: async () => {
        await client.close();
        await server.close();
      },
    };
  }
}
