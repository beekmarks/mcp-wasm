import { LLMHandler } from '../llm';
import { BrowserTransport } from '../browser-transport';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MLCEngine } from '@mlc-ai/web-llm';

// Mock MLCEngine
jest.mock('@mlc-ai/web-llm', () => ({
  MLCEngine: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  })),
  CreateMLCEngine: jest.fn().mockResolvedValue({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  })
}));

describe('LLMHandler', () => {
  let llmHandler: LLMHandler;
  let transport: BrowserTransport;
  let server: McpServer;
  let mockStatusCallback: jest.Mock;

  beforeEach(async () => {
    transport = new BrowserTransport(true);
    await transport.start();
    
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      tools: []
    });
    mockStatusCallback = jest.fn();
    llmHandler = new LLMHandler(transport, server, mockStatusCallback);
  });

  afterEach(async () => {
    await transport.stop();
  });

  describe('Tool Call Processing', () => {
    test('should parse tool calls correctly', async () => {
      const response = `Let me calculate that for you: <tool>calculate</tool><params>{"operation":"add","a":5,"b":3}</params>`;
      const toolCalls = (llmHandler as any).parseToolCalls(response);
      
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toEqual({
        name: 'calculate',
        params: {
          operation: 'add',
          a: 5,
          b: 3
        }
      });
    });

    test('should handle multiple tool calls in one response', async () => {
      const response = `
        First calculation: <tool>calculate</tool><params>{"operation":"add","a":5,"b":3}</params>
        Second calculation: <tool>calculate</tool><params>{"operation":"multiply","a":4,"b":2}</params>
      `;
      const toolCalls = (llmHandler as any).parseToolCalls(response);
      
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0].name).toBe('calculate');
      expect(toolCalls[1].name).toBe('calculate');
    });

    test('should execute calculator tool calls correctly', async () => {
      const toolCall = {
        name: 'calculate',
        params: {
          operation: 'add',
          a: 5,
          b: 3
        }
      };

      // Mock the transport response
      const mockCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'calculate') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            result: {
              contents: [{ type: 'text', text: '8' }]
            }
          };
        }
      });
      transport.onMessage(mockCallback);

      const result = await (llmHandler as any).handleToolCall(toolCall);
      expect(result).toBe('8');
    });

    test('should execute storage tool calls correctly', async () => {
      // Test set operation
      const setToolCall = {
        name: 'storage-set',
        params: {
          key: 'test-key',
          value: 'test-value'
        }
      };

      // Mock set response
      const setCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'storage-set') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            result: {
              contents: [{ type: 'text', text: 'Value stored successfully' }]
            }
          };
        }
      });
      transport.onMessage(setCallback);

      await (llmHandler as any).handleToolCall(setToolCall);

      // Test get operation
      const getToolCall = {
        name: 'storage-get',
        params: {
          key: 'test-key'
        }
      };

      // Mock get response
      const getCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'storage-get') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            result: {
              contents: [{ type: 'text', text: 'test-value' }]
            }
          };
        }
      });
      transport.onMessage(getCallback);

      const result = await (llmHandler as any).handleToolCall(getToolCall);
      expect(result).toBe('test-value');
    });

    test('should handle streaming responses with tool calls', async () => {
      // Mock MLCEngine
      (llmHandler as any).engine = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue([
              { choices: [{ delta: { content: 'Let me calculate: ' } }] },
              { choices: [{ delta: { content: '<tool>calculate</tool>' } }] },
              { choices: [{ delta: { content: '<params>{"operation":"add","a":5,"b":3}</params>' } }] },
              { choices: [{ delta: { content: ' The result is: 8' } }] }
            ])
          }
        }
      };

      // Mock transport response for tool call
      const mockCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'calculate') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            result: {
              contents: [{ type: 'text', text: '8' }]
            }
          };
        }
      });
      transport.onMessage(mockCallback);

      const response = await llmHandler.processUserInput('What is 5 plus 3?');
      expect(response).toContain('8');
    });
  });

  describe('Error Handling', () => {
    test('should handle division by zero error', async () => {
      const toolCall = {
        name: 'calculate',
        params: {
          operation: 'divide',
          a: 5,
          b: 0
        }
      };

      // Mock error response
      const mockCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'calculate') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            error: {
              code: -32603,
              message: 'Division by zero'
            }
          };
        }
      });
      transport.onMessage(mockCallback);

      await expect((llmHandler as any).handleToolCall(toolCall))
        .rejects.toThrow('Division by zero');
    });

    test('should handle storage key not found error', async () => {
      const toolCall = {
        name: 'storage-get',
        params: {
          key: 'non-existent-key'
        }
      };

      // Mock error response
      const mockCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'storage-get') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            error: {
              code: -32603,
              message: 'Key not found'
            }
          };
        }
      });
      transport.onMessage(mockCallback);

      await expect((llmHandler as any).handleToolCall(toolCall))
        .rejects.toThrow('Key not found');
    });

    test('should handle invalid tool name', async () => {
      const toolCall = {
        name: 'invalid-tool',
        params: {}
      };

      // Mock error response
      const mockCallback = jest.fn((msg) => {
        if (msg.method === 'tool' && msg.params.name === 'invalid-tool') {
          transport['lastResponse'] = {
            jsonrpc: "2.0" as const,
            id: msg.id,
            error: {
              code: -32603,
              message: 'Unknown tool'
            }
          };
        }
      });
      transport.onMessage(mockCallback);

      await expect((llmHandler as any).handleToolCall(toolCall))
        .rejects.toThrow('Unknown tool');
    });
  });
});
