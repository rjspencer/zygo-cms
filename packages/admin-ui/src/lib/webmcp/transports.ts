import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export class MessagePortMCPTransport implements Transport {
  private port: MessagePort;
  private started = false;
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;

  constructor(port: MessagePort) {
    this.port = port;
  }

  async start(): Promise<void> {
    if (this.started || this.closed) return;
    this.started = true;

    this.port.onmessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        this.onmessage?.(data);
      } catch (err) {
        this.onerror?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    this.port.onmessageerror = () => {
      this.onerror?.(new Error('MessagePort deserialization error'));
    };

    if (typeof this.port.start === 'function') {
      this.port.start();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }
    try {
      this.port.postMessage(message);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    try {
      this.port.onmessage = null;
      this.port.onmessageerror = null;
    } catch {
      // ignore
    }

    if (typeof (this.port as any).unref === 'function') {
      try {
        (this.port as any).unref();
      } catch {
        // ignore
      }
    }

    if (typeof this.port.close === 'function') {
      try {
        this.port.close();
      } catch {
        // ignore
      }
    }

    this.onclose?.();
  }
}

export function createMessagePortPair(): [MessagePortMCPTransport, MessagePortMCPTransport] {
  if (typeof MessageChannel === 'undefined') {
    throw new Error('MessageChannel is not supported in this environment');
  }
  const channel = new MessageChannel();
  return [
    new MessagePortMCPTransport(channel.port1),
    new MessagePortMCPTransport(channel.port2),
  ];
}

export class WebSocketMCPTransport implements Transport {
  private socket?: WebSocket;
  private url?: string;
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;

  constructor(urlOrSocket: string | WebSocket) {
    if (typeof urlOrSocket === 'string') {
      this.url = urlOrSocket;
    } else {
      this.socket = urlOrSocket;
    }
  }

  async start(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.setupSocket(this.socket);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.socket && this.url) {
        this.socket = new WebSocket(this.url);
      }

      if (!this.socket) {
        reject(new Error('No WebSocket or URL provided'));
        return;
      }

      const ws = this.socket;
      this.setupSocket(ws);

      if (ws.readyState === WebSocket.OPEN) {
        resolve();
      } else {
        const onOpen = () => {
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          reject(new Error('WebSocket connection failed'));
        };
        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
      }
    });
  }

  private setupSocket(ws: WebSocket): void {
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        this.onmessage?.(data);
      } catch (err) {
        this.onerror?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    ws.onerror = () => {
      this.onerror?.(new Error('WebSocket error'));
    };

    ws.onclose = () => {
      if (!this.closed) {
        this.closed = true;
        this.onclose?.();
      }
    };
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.socket.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.socket) {
      try {
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        this.socket.close();
      } catch {
        // ignore
      }
    }
    this.onclose?.();
  }
}

export { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
