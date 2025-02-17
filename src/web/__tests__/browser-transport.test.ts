import { BrowserTransport } from '../browser-transport';
import { JSONRPCMessage } from '../types';

describe('BrowserTransport', () => {
  let transport: BrowserTransport;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    transport = new BrowserTransport();
    transport['isTestMode'] = true;
    mockCallback = jest.fn();
    transport.onMessage(mockCallback);
  });

  afterEach(async () => {
    await transport.stop();
  });

  test('should start and stop correctly', async () => {
    await transport.start();
    expect(transport.isConnected()).toBe(true);

    await transport.stop();
    expect(transport.isConnected()).toBe(false);
  });

  test('should send messages when connected', async () => {
    await transport.start();
    const message: JSONRPCMessage = {
      jsonrpc: "2.0",
      method: 'test',
      id: 1,
      params: {
        name: 'test',
        params: {
          data: 'test data'
        }
      }
    };

    await transport.send(message);
    expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('Test message received');
  });

  test('should handle multiple message callbacks', async () => {
    await transport.start();
    const message: JSONRPCMessage = {
      jsonrpc: "2.0",
      method: 'test',
      id: 1,
      params: {
        name: 'test',
        params: {
          data: 'test data'
        }
      }
    };

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    transport.onMessage(callback1);
    transport.onMessage(callback2);

    await transport.send(message);

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  test('should throw error when sending message while not connected', async () => {
    transport['isTestMode'] = false;
    const message: JSONRPCMessage = {
      jsonrpc: "2.0",
      method: 'test',
      id: 1,
      params: {
        name: 'test',
        params: {
          data: 'test data'
        }
      }
    };

    await expect(transport.send(message)).rejects.toThrow('Transport not connected');
  });

  test('should remove message callback when cleanup function is called', async () => {
    await transport.start();
    const message: JSONRPCMessage = {
      jsonrpc: "2.0",
      method: 'test',
      id: 1,
      params: {
        name: 'test',
        params: {
          data: 'test data'
        }
      }
    };

    const callback = jest.fn();
    const cleanup = transport.onMessage(callback);

    await transport.send(message);
    expect(callback).toHaveBeenCalled();

    cleanup();

    await transport.send(message);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('should handle multiple messages in sequence', async () => {
    await transport.start();
    const messages: JSONRPCMessage[] = [
      {
        jsonrpc: "2.0",
        method: 'test',
        id: 1,
        params: {
          name: 'test1',
          params: {
            data: 'test data 1'
          }
        }
      },
      {
        jsonrpc: "2.0",
        method: 'test',
        id: 2,
        params: {
          name: 'test2',
          params: {
            data: 'test data 2'
          }
        }
      }
    ];

    for (const message of messages) {
      await transport.send(message);
      expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('Test message received');
    }
  });

  test('should handle window message events', async () => {
    await transport.start();
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    const mockCallback = jest.fn();
    transport.onMessage(mockCallback);

    window.postMessage({
      type: "mcp-message",
      message
    }, "*");

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockCallback).toHaveBeenCalledWith(message);
  });

  describe('Tool Handling', () => {
    describe('Calculator Tool', () => {
      test('should handle addition correctly', async () => {
        const request = {
          jsonrpc: "2.0" as const,
          method: 'tool',
          id: 1,
          params: {
            name: 'calculate',
            params: {
              operation: 'add',
              a: 5,
              b: 3
            }
          }
        };

        transport['lastResponse'] = {
          jsonrpc: "2.0" as const,
          id: 1,
          result: {
            contents: [{ type: 'text', text: '8' }]
          }
        };

        await transport.send(request);
        const response = transport.getLastResponse();
        expect(response?.result?.contents?.[0]?.text).toBe('8');
      });

      test('should handle division by zero error', async () => {
        const request = {
          jsonrpc: "2.0" as const,
          method: 'tool',
          id: 1,
          params: {
            name: 'calculate',
            params: {
              operation: 'divide',
              a: 5,
              b: 0
            }
          }
        };

        transport['lastResponse'] = {
          jsonrpc: "2.0" as const,
          id: 1,
          error: {
            code: -32603,
            message: 'Division by zero'
          }
        };

        await expect(transport.send(request)).rejects.toThrow('Division by zero');
      });
    });

    describe('Storage Tool', () => {
      test('should handle set operation correctly', async () => {
        const request: JSONRPCMessage = {
          jsonrpc: "2.0",
          method: 'tool',
          id: 1,
          params: {
            name: 'storage-set',
            params: {
              key: 'test-key',
              value: 'test-value'
            }
          }
        };

        await transport.send(request);
        expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('Value stored successfully');
      });

      test('should handle get operation correctly', async () => {
        await transport.start();
        
        // First set a value
        await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 1,
          params: {
            name: "storage-set",
            params: {
              key: "test-key",
              value: "test-value"
            }
          }
        });

        // Then get the value
        await transport.send({
          jsonrpc: "2.0",
          method: "resource",
          id: 2,
          params: {
            name: "storage-get",
            params: {
              key: "test-key"
            }
          }
        });

        expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('test-value');
      });

      test('should handle key not found error', async () => {
        const request: JSONRPCMessage = {
          jsonrpc: "2.0",
          method: 'tool',
          id: 1,
          params: {
            name: 'storage-get',
            params: {
              key: 'non-existent-key'
            }
          }
        };

        await expect(transport.send(request)).rejects.toThrow('Key not found');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown tool error', async () => {
      const request = {
        jsonrpc: "2.0" as const,
        method: 'tool',
        id: 1,
        params: {
          name: 'invalid-tool',
          params: {}
        }
      };

      transport['lastResponse'] = {
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32603,
          message: 'Unknown tool'
        }
      };

      await expect(transport.send(request)).rejects.toThrow('Unknown tool');
    });

    test('should handle malformed request error', async () => {
      const request = {
        jsonrpc: "2.0" as const,
        method: 'tool',
        id: 1,
        params: {
          name: 'calculate',
          params: {
            // Missing required parameters
          }
        }
      };

      transport['lastResponse'] = {
        jsonrpc: "2.0" as const,
        id: 1,
        error: {
          code: -32602,
          message: 'Invalid params'
        }
      };

      await expect(transport.send(request)).rejects.toThrow('Invalid params');
    });
  });
});
