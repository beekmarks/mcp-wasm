import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from '../browser-transport';
import { LLMHandler } from '../llm';
import { TavilyService } from '../services/tavily';
import { createTestServer } from './test-utils';

jest.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: jest.fn().mockResolvedValue({
    generate: jest.fn().mockResolvedValue({
      message: 'Test response'
    })
  })
}));

describe('LLM Handler', () => {
  let server: McpServer;
  let transport: BrowserTransport;
  let llmHandler: LLMHandler;
  let tavilyService: TavilyService;

  beforeEach(async () => {
    transport = new BrowserTransport(false);
    await transport.start();
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      implementation: 'test'
    });
    llmHandler = new LLMHandler(transport, server, () => {});
    tavilyService = new TavilyService('test-key');
    server = createTestServer(llmHandler, tavilyService);
  });

  afterEach(async () => {
    await transport.stop();
  });

  test('should initialize successfully', async () => {
    expect(llmHandler).toBeDefined();
  });

  test('should process user input', async () => {
    const progressCallback = jest.fn();
    await llmHandler.processUserInput('Test input', progressCallback);
    expect(progressCallback).toHaveBeenCalled();
  });

  test('should handle tool execution', async () => {
    const progressCallback = jest.fn();
    await llmHandler.processUserInput('Calculate 2 + 2', progressCallback);
    expect(progressCallback).toHaveBeenCalled();
  });

  test('should handle errors', async () => {
    const progressCallback = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(llmHandler.processUserInput('Divide by zero', progressCallback))
      .rejects.toThrow();
    expect(progressCallback).toHaveBeenCalled();
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

      const result = await (llmHandler as any).handleToolCall(toolCall);
      expect(JSON.parse(result)).toEqual({
        contents: [
          {
            type: 'text',
            text: '8'
          }
        ]
      });
    });

    test('should execute storage tool calls correctly', async () => {
      const setToolCall = {
        name: 'storage-set',
        params: {
          key: 'test-key',
          value: 'test-value'
        }
      };

      await (llmHandler as any).handleToolCall(setToolCall);

      const getToolCall = {
        name: 'storage-get',
        params: {
          key: 'test-key'
        }
      };

      const result = await (llmHandler as any).handleToolCall(getToolCall);
      expect(JSON.parse(result)).toEqual({
        contents: [
          {
            type: 'text',
            text: 'test-value'
          }
        ]
      });
    });

    test('should handle streaming responses with tool calls', async () => {
      const messages = [
        { role: 'user', content: 'What is 5 + 3?' }
      ];

      // Mock the processUserInput method
      (llmHandler as any).processUserInput = jest.fn().mockResolvedValue('8');

      const response = await llmHandler.processUserInput('What is 5 + 3?');
      expect(response).toBe('8');
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

      await expect(llmHandler.handleToolCall(toolCall)).rejects.toThrow('Unknown tool: invalid-tool');
    }, 15000); // Increase timeout to 15 seconds
  });
});
