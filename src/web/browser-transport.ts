import { Transport } from './transport';
import { JSONRPCMessage, JSONRPCResponse } from './types';

interface CallbackWithId {
  (response: JSONRPCResponse): void;
  id: number;
}

export class BrowserTransport implements Transport {
  private callbacks: CallbackWithId[] = [];
  private storage: Map<string, any> = new Map();
  private lastResponse: JSONRPCResponse | null = null;
  private started: boolean = false;
  private isTestMode: boolean = false;
  private lastRequestId: number | null = null;

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
    const callbackWithId = Object.assign(callback, { id: this.callbacks.length });
    this.callbacks.push(callbackWithId);
    return () => {
      const index = this.callbacks.findIndex(cb => cb.id === callbackWithId.id);
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

    try {
      if (message.method === 'tool') {
        response = await this.handleToolMessage(message);
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
    } catch (error) {
      console.error('Error in send:', error);
      throw error;
    }
  }

  getLastResponse(): JSONRPCResponse | null {
    return this.lastResponse;
  }

  private formatToolResponse(result: any, id: number): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        contents: [
          {
            type: 'text',
            text: result
          }
        ]
      }
    };
  }

  async handleToolMessage(message: JSONRPCMessage): Promise<JSONRPCResponse> {
    console.log('🔄 Browser Transport: Handling tool message:', message.params);

    const { name: toolName, params: toolParams } = message.params;

    switch (toolName) {
      case 'calculate':
        const { operation, a, b } = toolParams;
        if (!operation || typeof a !== 'number' || typeof b !== 'number') {
          throw new Error('Invalid params');
        }
        switch (operation) {
          case 'add':
            return this.formatToolResponse(String(a + b), message.id);
          case 'subtract':
            return this.formatToolResponse(String(a - b), message.id);
          case 'multiply':
            return this.formatToolResponse(String(a * b), message.id);
          case 'divide':
            if (b === 0) {
              throw new Error('Division by zero');
            }
            return this.formatToolResponse(String(a / b), message.id);
          default:
            throw new Error('Invalid operation');
        }

      case 'storage-set':
        const { key, value } = toolParams;
        if (!key || !value) {
          throw new Error('Invalid key or value');
        }
        localStorage.setItem(key, value);
        return this.formatToolResponse('Value stored successfully', message.id);

      case 'storage-get':
        const storedValue = localStorage.getItem(toolParams.key);
        if (!storedValue) {
          throw new Error('Key not found');
        }
        return this.formatToolResponse(storedValue, message.id);

      case 'tavily-search':
        console.log('🔍 Tavily Search: Forwarding request to WASM server');
        // Forward the search request to the WASM server
        window.postMessage({
          type: 'mcp-tool-request',
          message: {
            jsonrpc: '2.0',
            method: 'tool',
            id: message.id,
            params: {
              name: toolName,
              params: toolParams
            }
          }
        }, '*');
        
        // Return a promise that resolves with the search response
        return new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
            if (event.data?.type === 'mcp-tool-response' && event.data.response?.id === message.id) {
              window.removeEventListener('message', handler);
              const searchResponse = event.data.response;
              console.log('🔍 Tavily Search Response:', searchResponse);
              
              // Extract the text content from the response
              const content = searchResponse.result?.contents?.[0]?.text;
              console.log('📄 Response content:', content);
              
              if (content) {
                try {
                  const jsonContent = JSON.parse(content);
                  console.log('🎯 Parsed JSON content:', jsonContent);
                  resolve({
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                      contents: [{
                        type: 'text',
                        text: JSON.stringify(jsonContent)
                      }]
                    }
                  });
                } catch (e) {
                  console.error('❌ Error parsing JSON content:', e);
                  resolve({
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                      contents: [{
                        type: 'text',
                        text: content
                      }]
                    }
                  });
                }
              } else {
                console.error('❌ No content in response');
                resolve({
                  jsonrpc: '2.0',
                  id: message.id,
                  result: {
                    contents: [{
                      type: 'text',
                      text: 'No results found'
                    }]
                  }
                });
              }
            }
          };
          window.addEventListener('message', handler);
        });

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  public messageHandler(event: MessageEvent) {
    // Only process mcp-tool-response messages
    if (event.data?.type !== "mcp-tool-response") {
      return;
    }

    // Find the callback for this response
    const callback = this.callbacks.find(cb => cb.id === event.data.id);
    if (callback) {
      callback(event.data.response);
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    // Store the last response
    this.lastResponse = event.data.response;
  }

  private async handleResourceMessage(message: JSONRPCMessage): Promise<any> {
    const { name, params } = message.params;
    switch (name) {
      case 'storage-get': {
        const { key } = params;
        if (!key) {
          throw new Error('Key is required');
        }
        const value = localStorage.getItem(key);
        if (value === null) {
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
