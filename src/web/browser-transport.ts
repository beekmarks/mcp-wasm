import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface JSONRPCMessage {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: any;
}

export class BrowserTransport implements Transport {
  private callbacks: ((message: any) => void)[] = [];
  private started = false;
  private isTestMode = false;

  constructor(isTestMode = false) {
    this.isTestMode = isTestMode;
  }

  async start(): Promise<void> {
    this.started = true;
    window.addEventListener("message", this.handleWindowMessage.bind(this));
    console.log('Browser transport initialized');
  }

  async stop(): Promise<void> {
    this.started = false;
    window.removeEventListener("message", this.handleWindowMessage.bind(this));
    this.callbacks = [];
    console.log('Browser transport stopped');
  }

  async close(): Promise<void> {
    await this.stop();
  }

  isConnected(): boolean {
    return this.started;
  }

  onMessage(callback: (message: any) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  async send(message: any): Promise<void> {
    if (!this.started) {
      throw new Error('Transport not connected');
    }

    if (this.isTestMode) {
      // In test mode, just pass through the message
      window.postMessage({
        type: "mcp-message",
        message
      }, "*");
      this.callbacks.forEach(callback => callback(message));
      return;
    }

    try {
      let response;
      if (message.method === 'tool') {
        const result = await this.handleToolMessage(message);
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      } else if (message.method === 'resource') {
        const result = await this.handleResourceMessage(message);
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      } else {
        throw new Error(`Unknown method: ${message.method}`);
      }

      // Notify all callbacks
      this.callbacks.forEach(callback => callback(response));
    } catch (error) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      this.callbacks.forEach(callback => callback(errorResponse));
    }
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (event.data && event.data.type === "mcp-message") {
      const message = event.data.message;
      this.callbacks.forEach(callback => callback(message));
    }
  }

  private async handleToolMessage(message: any) {
    const { name, params } = message.params;
    switch (name) {
      case 'calculate': {
        const { operation, a, b } = params;
        let result;
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
            if (b === 0) throw new Error('Division by zero');
            result = a / b;
            break;
          default:
            throw new Error('Invalid operation');
        }
        return {
          content: [{ type: "text", text: result.toString() }]
        };
      }
      case 'set-storage': {
        const { key, value } = params;
        localStorage.setItem(key, value);
        return {
          content: [{ type: "text", text: 'Value stored successfully' }]
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async handleResourceMessage(message: any) {
    const { uri, key } = message.params;
    const value = localStorage.getItem(key);
    if (!value) {
      throw new Error('Key not found');
    }
    return {
      contents: [{
        uri,
        text: value
      }]
    };
  }
}
