import { Transport } from './transport';
import { JSONRPCMessage, JSONRPCResponse } from './types';

export class BrowserTransport implements Transport {
  private callbacks: ((response: JSONRPCResponse) => void)[] = [];
  private storage: Map<string, any> = new Map();
  private lastResponse: JSONRPCResponse | null = null;
  private started: boolean = false;
  private isTestMode: boolean = false;

  constructor(isTestMode: boolean = false) {
    this.isTestMode = isTestMode;
  }

  async start(): Promise<void> {
    this.started = true;
    window.addEventListener("message", this.handleWindowMessage.bind(this));
  }

  async stop(): Promise<void> {
    this.started = false;
    window.removeEventListener("message", this.handleWindowMessage.bind(this));
    this.callbacks = [];
  }

  async close(): Promise<void> {
    await this.stop();
  }

  isConnected(): boolean {
    return this.started;
  }

  onMessage(callback: (response: JSONRPCResponse) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  public async send(message: JSONRPCMessage): Promise<JSONRPCResponse> {
    if (!this.started && !this.isTestMode) {
      throw new Error('Transport not connected');
    }

    let response: JSONRPCResponse;

    if (message.method === 'tool') {
      response = this.handleToolMessage(message);
    } else if (message.method === 'test') {
      response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          contents: [{
            type: 'text',
            text: 'Test message received'
          }]
        }
      };
    } else if (message.method === 'resource') {
      response = {
        jsonrpc: "2.0",
        id: message.id,
        result: await this.handleResourceMessage(message)
      };
    } else {
      throw new Error(`Unknown method: ${message.method}`);
    }

    this.lastResponse = response;
    this.callbacks.forEach(callback => callback(response));
    return response;
  }

  getLastResponse(): JSONRPCResponse | null {
    return this.lastResponse;
  }

  private handleToolMessage(message: JSONRPCMessage): JSONRPCResponse {
    const { method, params } = message;
    if (method !== 'tool') {
      throw new Error('Invalid method');
    }

    const { name: toolName, params: toolParams } = params;

    switch (toolName) {
      case 'calculate': {
        const { operation, a, b } = toolParams;
        if (operation === 'divide' && b === 0) {
          throw new Error('Division by zero');
        }
        if (!operation || !a || !b) {
          throw new Error('Invalid params');
        }
        let result: number;
        switch (operation) {
          case 'add':
            result = a + b;
            break;
          case 'subtract':
            result = a - b;
            break;
          case 'multiply':
            result = a * b;
            break;
          case 'divide':
            result = a / b;
            break;
          default:
            throw new Error('Invalid operation');
        }
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            contents: [{ type: 'text', text: result.toString() }]
          }
        };
      }
      case 'storage-set': {
        const { key, value } = toolParams;
        if (!key) {
          throw new Error('Key is required');
        }
        this.storage.set(key, value);
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            contents: [{ type: 'text', text: 'Value stored successfully' }]
          }
        };
      }
      case 'storage-get': {
        const { key } = toolParams;
        if (!key) {
          throw new Error('Key is required');
        }
        const value = this.storage.get(key);
        if (value === undefined) {
          throw new Error('Key not found');
        }
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            contents: [{ type: 'text', text: value }]
          }
        };
      }
      default:
        throw new Error('Unknown tool');
    }
  }

  private async handleResourceMessage(message: JSONRPCMessage): Promise<any> {
    const { name, params } = message.params;
    switch (name) {
      case 'storage-get': {
        const { key } = params;
        if (!key) {
          throw new Error('Key is required');
        }
        const value = this.storage.get(key);
        if (value === undefined) {
          throw new Error('Key not found');
        }
        return {
          contents: [{ type: 'text', text: value }]
        };
      }
      default:
        throw new Error('Invalid resource');
    }
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (event.data && event.data.type === "mcp-message") {
      const message = event.data.message;
      this.callbacks.forEach(callback => callback(message));
    }
  }
}
