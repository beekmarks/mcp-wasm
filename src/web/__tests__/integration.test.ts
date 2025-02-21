import { initializeTestEnvironment } from './test-utils';
import { fireEvent } from '@testing-library/dom';
import { BrowserTransport } from '../browser-transport';
import { JSONRPCMessage, JSONRPCResponse } from '../types';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LLMHandler } from '../llm';
import { createTestServer, registerCalculatorTool, registerStorageTool } from './test-utils';
import { TavilyService } from '../services/tavily';
import { createServer } from '../server';

interface ExtendedJSONRPCResponse extends JSONRPCResponse {
  content?: Array<{
    type: 'text';
    text: string;
  }>;
}

describe('Integration Tests', () => {
  let server: McpServer;
  let transport: BrowserTransport;
  let llmHandler: LLMHandler;
  let tavilyService: TavilyService;

  beforeEach(async () => {
    transport = new BrowserTransport(false);
    await transport.start();
    llmHandler = new LLMHandler(transport, {} as McpServer, () => {});
    tavilyService = new TavilyService('test-key');
    server = createTestServer(llmHandler, tavilyService);
  });

  afterEach(async () => {
    await transport.stop();
  });

  describe('WebLLM-Tool Integration', () => {
    test('should process calculator request through LLM', async () => {
      const mockProgress = jest.fn();
      await llmHandler.processUserInput('What is 5 plus 3?', mockProgress);
      
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('8'));
    });

    test('should process search request through LLM', async () => {
      const mockProgress = jest.fn();
      const mockSearch = jest.fn().mockResolvedValue({
        results: [{
          title: 'Test Result',
          content: 'Important information',
          url: 'https://test.com'
        }]
      });
      jest.spyOn(llmHandler as any, 'search').mockImplementation(mockSearch);
      await llmHandler.processUserInput('What is the weather in Boston?', mockProgress);
      
      expect(mockProgress).toHaveBeenCalledWith(
        expect.stringContaining('Search results for: weather in Boston')
      );
      expect(mockSearch).toHaveBeenCalledWith('weather in Boston');
    });

    test('should process storage request through LLM', async () => {
      const mockProgress = jest.fn();
      await llmHandler.processUserInput('Store my name as John', mockProgress);
      
      const getResponse = await llmHandler.processUserInput('What is my name?', mockProgress);
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('John'));
    });

    test('should handle complex multi-tool workflows', async () => {
      const mockProgress = jest.fn();
      
      // First store some data
      await llmHandler.processUserInput('Store the temperature as 75', mockProgress);
      
      // Then use it in a calculation
      await llmHandler.processUserInput('What is the stored temperature plus 5?', mockProgress);
      
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('80'));
    });
  });

  describe('Server-Transport Integration', () => {
    test('should handle tool execution through transport', async () => {
      const message: JSONRPCMessage = {
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
      };

      await transport.send(message);
      expect(transport.getLastResponse()?.result?.contents?.[0]?.text)
        .toBe('Value stored successfully');
    });
    
    test('should handle resource access through transport', async () => {
      // First store a value
      const setMessage: JSONRPCMessage = {
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
      };

      await transport.send(setMessage);

      // Then retrieve it
      const getMessage: JSONRPCMessage = {
        jsonrpc: "2.0",
        method: "resource",
        id: 2,
        params: {
          name: "storage-get",
          params: {
            key: "test-key"
          }
        }
      };

      await transport.send(getMessage);
      expect(transport.getLastResponse()?.result?.contents?.[0]?.text)
        .toBe('Value for test-key');
    });
  });
  
  describe('End-to-End Workflows', () => {
    test('should handle complex workflows with multiple tools', async () => {
      const mockProgress = jest.fn();
      
      // Store some data
      await llmHandler.processUserInput('Store the price as 100', mockProgress);
      
      // Use the stored data in a calculation
      await llmHandler.processUserInput('What is 20% of the stored price?', mockProgress);
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('20'));
      
      // Search for related information
      const mockSearch = jest.fn().mockResolvedValue({
        results: [{
          title: 'Test Result',
          content: 'Important information',
          url: 'https://test.com'
        }]
      });
      jest.spyOn(llmHandler as any, 'search').mockImplementation(mockSearch);
      await llmHandler.processUserInput('Search for average prices', mockProgress);
      expect(mockProgress).toHaveBeenCalledWith(
        expect.stringContaining('Search results for:')
      );
      expect(mockSearch).toHaveBeenCalledWith('average prices');
    });

    test('should handle error recovery in workflows', async () => {
      const mockProgress = jest.fn();
      
      // Simulate a failed search
      const mockSearch = jest.fn().mockRejectedValue(new Error('API Error'));
      jest.spyOn(llmHandler as any, 'search').mockImplementation(mockSearch);
      
      // The workflow should continue even if search fails
      await llmHandler.processUserInput('Search for prices and calculate 20% of 100', mockProgress);
      
      // Should still complete the calculation part
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('20'));
    });

    test('should maintain context across interactions', async () => {
      const mockProgress = jest.fn();
      
      // Store multiple values
      await llmHandler.processUserInput('Store temperature as 75', mockProgress);
      await llmHandler.processUserInput('Store humidity as 60', mockProgress);
      
      // Use both values
      await llmHandler.processUserInput('What is the temperature plus humidity?', mockProgress);
      expect(mockProgress).toHaveBeenCalledWith(expect.stringContaining('135'));
    });
  });

  describe('Calculator Operations', () => {
    it('should handle calculator operations', async () => {
      const response = await server.execute({
        name: 'calculator',
        params: { operation: 'add', a: 5, b: 3 }
      });

      expect(response.content[0].text).toBe('Result: 8');
    });
  });

  describe('Storage Operations', () => {
    it('should handle storage operations', async () => {
      const setResponse = await server.execute({
        name: 'storage-set',
        params: { key: 'test-key', value: 'test-value' }
      });

      expect(setResponse.content[0].text).toBe('Stored test-key=test-value');

      const getResponse = await server.execute({
        name: 'storage-get',
        params: { key: 'test-key' }
      });

      expect(getResponse.content[0].text).toBe('Value for test-key');
    });
  });

  describe('LLM Interactions', () => {
    it('should handle LLM interactions', async () => {
      const mockEngine = {
        chatCompletion: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        })
      };

      jest.spyOn(llmHandler as any, 'engine', 'get').mockReturnValue(mockEngine);

      const progressCallback = jest.fn();
      await llmHandler.processUserInput('Test input', progressCallback);

      expect(mockEngine.chatCompletion).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith('Test response');
    });
  });

  describe('Calculator Tool', () => {
    it('should perform basic calculations', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
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
      });

      expect(response.result?.content[0].text).toBe('Result: 8');
    });

    it('should handle division by zero error', async () => {
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'calculate',
          params: {
            operation: 'divide',
            a: 10,
            b: 0
          }
        }
      })).rejects.toThrow('Division by zero');
    });
  });

  describe('Storage Tool', () => {
    it('should store and retrieve values', async () => {
      const setResponse = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'storage-set',
          params: {
            key: 'test-key',
            value: 'test-value'
          }
        }
      });

      expect(setResponse.result?.content[0].text).toBe('Stored value for key: test-key');

      const getResponse = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 2,
        params: {
          name: 'storage-get',
          params: {
            key: 'test-key'
          }
        }
      });

      expect(getResponse.result?.content[0].text).toBe('Value for key test-key: test-value');
    });

    it('should handle missing keys', async () => {
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'storage-get',
          params: {
            key: 'non-existent-key'
          }
        }
      })).rejects.toThrow('Key not found');
    });
  });

  describe('Tavily Tool', () => {
    it('should perform search', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'tavily-search',
          params: {
            query: 'test query'
          }
        }
      });

      expect(response.result?.content[0].text).toContain('Test Result');
    });

    it('should extract content', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'tavily-extract',
          params: {
            url: 'https://test.com'
          }
        }
      });

      expect(response.result?.content[0].text).toBe('Test extracted content');
    });
  });

  describe('New Integration Tests', () => {
    test('should handle calculator tool', async () => {
      const { transport } = await initializeTestEnvironment();

      const response = await transport.send({
        jsonrpc: '2.0',
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
      } as JSONRPCMessage) as ExtendedJSONRPCResponse;

      expect(response.content?.[0].text).toBe('Result: 8');
    });

    test('should handle storage tool', async () => {
      const { transport } = await initializeTestEnvironment();

      // Set value
      await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'storage-set',
          params: {
            key: 'test-key',
            value: 'test-value'
          }
        }
      } as JSONRPCMessage);

      // Get value
      const response = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 2,
        params: {
          name: 'storage-get',
          params: {
            key: 'test-key'
          }
        }
      } as JSONRPCMessage) as ExtendedJSONRPCResponse;

      expect(response.content?.[0].text).toBe('Value for key test-key: test-value');
    });

    test('should handle errors gracefully', async () => {
      const { transport } = await initializeTestEnvironment();

      // Division by zero
      await expect(transport.send({
        jsonrpc: '2.0',
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
      } as JSONRPCMessage)).rejects.toThrow('Division by zero');

      // Non-existent key
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 2,
        params: {
          name: 'storage-get',
          params: {
            key: 'non-existent-key'
          }
        }
      } as JSONRPCMessage)).rejects.toThrow('Key not found');

      // Invalid tool
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 3,
        params: {
          name: 'invalid-tool',
          params: {}
        }
      } as JSONRPCMessage)).rejects.toThrow('Unknown tool: invalid-tool');

      // Invalid params
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 4,
        params: {
          name: 'calculate',
          params: {}
        }
      } as JSONRPCMessage)).rejects.toThrow('Invalid params');
    });
  });

  describe('Calculator Tool', () => {
    it('should perform addition', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
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
      });

      expect(response.result?.content[0].text).toBe('Result: 8');
    });

    it('should handle division by zero error', async () => {
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'calculate',
import { setupTestEnvironment, setupCalculatorUI, setupStorageUI } from './test-utils';
import { fireEvent } from '@testing-library/dom';
import { BrowserTransport } from '../browser-transport';
import { JSONRPCMessage, JSONRPCResponse } from '../types';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('Integration Tests', () => {
  let transport: BrowserTransport;

  beforeEach(() => {
    transport = new BrowserTransport();
    transport['isTestMode'] = true;
  });

  describe('Server-Transport Integration', () => {
    test('should handle tool execution through transport', async () => {
      const { server } = await setupTestEnvironment();
      
      const message: JSONRPCMessage = {
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
      };

      await transport.send(message);
      expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('Value stored successfully');
    });
    
    test('should handle resource access through transport', async () => {
      const { server } = await setupTestEnvironment();
      
      // First store a value
      const setMessage: JSONRPCMessage = {
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
      };

      await transport.send(setMessage);

      // Then retrieve it
      const getMessage: JSONRPCMessage = {
        jsonrpc: "2.0",
        method: "resource",
        id: 2,
        params: {
          name: "storage-get",
          params: {
            key: "test-key"
          }
        }
      };

      await transport.send(getMessage);
      expect(transport.getLastResponse()?.result?.contents?.[0]?.text).toBe('test-value');
    });
  });
  
  describe('UI Integration', () => {
    beforeEach(async () => {
      await setupTestEnvironment();
      setupCalculatorUI();
    });
    
    test('should handle calculator UI interaction', async () => {
      // Set up inputs
      const num1Input = document.getElementById('num1') as HTMLInputElement;
      const num2Input = document.getElementById('num2') as HTMLInputElement;
      const operationSelect = document.getElementById('operation') as HTMLSelectElement;
      const calcButton = document.getElementById('calcButton') as HTMLButtonElement;
      const output = document.getElementById('calcOutput');
      
      // Test each operation
      const operations = [
        { op: 'add', a: 5, b: 3, expected: '8' },
        { op: 'subtract', a: 10, b: 4, expected: '6' },
        { op: 'multiply', a: 6, b: 7, expected: '42' },
        { op: 'divide', a: 15, b: 3, expected: '5' }
      ];
      
      for (const { op, a, b, expected } of operations) {
        operationSelect.value = op;
        num1Input.value = a.toString();
        num2Input.value = b.toString();
        
        fireEvent.click(calcButton);
        
        // Wait for the calculation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(output?.textContent).toBe(`Result: ${expected}`);
      }
    });
    
    test('should handle calculator error cases', async () => {
      const num1Input = document.getElementById('num1') as HTMLInputElement;
      const num2Input = document.getElementById('num2') as HTMLInputElement;
      const operationSelect = document.getElementById('operation') as HTMLSelectElement;
      const calcButton = document.getElementById('calcButton') as HTMLButtonElement;
      const output = document.getElementById('calcOutput');
      
      // Test division by zero
      operationSelect.value = 'divide';
      num1Input.value = '10';
      num2Input.value = '0';
      
      fireEvent.click(calcButton);
      
      // Wait for the error to be displayed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(output?.textContent).toContain('Error');
      expect(output?.textContent).toContain('Division by zero');
    });
  });
  
  describe('Storage UI Integration', () => {
    beforeEach(async () => {
      await setupTestEnvironment();
      setupStorageUI();
    });
    
    test('should handle storage UI interaction', async () => {
      const keyInput = document.getElementById('storageKey') as HTMLInputElement;
      const valueInput = document.getElementById('storageValue') as HTMLInputElement;
      const output = document.getElementById('storageOutput');
      const setButton = document.getElementById('setStorageButton');
      const getButton = document.getElementById('getStorageButton');

      if (!keyInput || !valueInput || !output || !setButton || !getButton) {
        throw new Error('Storage UI elements not found');
      }

      keyInput.value = 'test-key';
      valueInput.value = 'test-value';

      // Set value
      fireEvent.click(setButton);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(output.textContent).toContain('Value stored successfully');
      
      // Get value
      valueInput.value = '';
      fireEvent.click(getButton);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(valueInput.value).toBe('test-value');
    });

    test('should handle missing storage keys', async () => {
      const output = document.createElement('div');
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

      try {
        await transport.send(request);
      } catch (error: any) {
        output.textContent = error.message;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(output?.textContent).toContain('Key not found');
    });
  });
  
  describe('End-to-End Workflows', () => {
    test('complete calculator workflow', async () => {
      const testCases = [
        { a: 5, b: 3, expected: ['8', '2', '15', '1.6666666666666667'] }
      ];
      
      for (const { a, b, expected } of testCases) {
        for (let i = 0; i < 4; i++) {
          const message: JSONRPCMessage = {
            jsonrpc: "2.0",
            method: "tool",
            id: i + 1,
            params: {
              name: "calculate",
              params: {
                operation: ['add', 'subtract', 'multiply', 'divide'][i],
                a,
                b
              }
            }
          };
          
          const mockCallback = jest.fn();
          transport.onMessage(mockCallback);
          await transport.send(message);
          
          // Wait for the calculation to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          expect(mockCallback).toHaveBeenCalled();
          const response = mockCallback.mock.calls[0][0];
          expect(response.result.contents[0].text).toBe(expected[i]);
        }
      }
    });
    
    test('complete storage workflow', async () => {
      const testData = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      
      for (const { key, value } of testData) {
        // Store value
        await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 1,
          params: {
            name: "storage-set",
            params: { key, value }
          }
        });
        
        // Wait for the storage operation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retrieve value
        const mockCallback = jest.fn();
        transport.onMessage(mockCallback);
        
        await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 2,
          params: {
            name: "storage-get",
            params: {
              key: key
            }
          }
        });
        
        // Wait for the retrieval to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockCallback).toHaveBeenCalled();
        const response = mockCallback.mock.calls[0][0];
        expect(response.result.contents[0].text).toBe(value);
      }
    });
    
    test('should handle batch operations', async () => {
      const { server } = await setupTestEnvironment();
      
      const testData = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      
      for (const { key, value } of testData) {
        // Store value
        await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 1,
          params: {
            name: "storage-set",
            params: {
              key: key,
              value: value
            }
          }
        });

        // Verify value
        const mockCallback = jest.fn();
        transport.onMessage(mockCallback);
        
        const response = await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 2,
          params: {
            name: "storage-get",
            params: {
              key: key
            }
          }
        });

        expect(response?.result?.contents?.[0]?.text).toBe(value);
      }
    });
    
    test('should handle storage operations', async () => {
      const { server } = await setupTestEnvironment();
      const testData = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      
      for (const { key, value } of testData) {
        // Store value
        await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 1,
          params: {
            name: "storage-set",
            params: {
              key: key,
              value: value
            }
          }
        });

        // Verify value
        const response = await transport.send({
          jsonrpc: "2.0",
          method: "tool",
          id: 2,
          params: {
            name: "storage-get",
            params: {
              key: key
            }
          }
        });

        expect(response.result?.contents?.[0]?.text).toBe(value);
      }
    });
  });
});
            b: 0
          }
        }
      })).rejects.toThrow('Division by zero');
    });
  });

  describe('Storage Tool', () => {
    it('should store and retrieve values', async () => {
      const setResponse = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'storage-set',
          params: {
            key: 'test-key',
            value: 'test-value'
          }
        }
      });

      expect(setResponse.result?.content[0].text).toBe('Stored value for key: test-key');

      const getResponse = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 2,
        params: {
          name: 'storage-get',
          params: {
            key: 'test-key'
          }
        }
      });

      expect(getResponse.result?.content[0].text).toBe('Value for key test-key: test-value');
    });

    it('should handle non-existent key', async () => {
      await expect(transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'storage-get',
          params: {
            key: 'non-existent-key'
          }
        }
      })).rejects.toThrow('Key not found');
    });
  });

  describe('Tavily Tool', () => {
    it('should perform search', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'tavily-search',
          params: {
            query: 'test query'
          }
        }
      });

      expect(response.result?.content[0].text).toContain('Test Result');
    });

    it('should extract content', async () => {
      const response = await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: 1,
        params: {
          name: 'tavily-extract',
          params: {
            url: 'https://test.com'
          }
        }
      });

      expect(response.result?.content[0].text).toBe('Test extracted content');
    });
  });

  describe('Integration Tests', () => {
    let transport: BrowserTransport;
    let server: McpServer;
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

    describe('Calculator Tool', () => {
      test('should handle addition', async () => {
        const response = await server.execute({
          name: 'calculate',
          params: {
            operation: 'add',
            a: 5,
            b: 3
          }
        });
        expect(response.content[0].text).toBe('Result: 8');
      });

      test('should handle division by zero', async () => {
        await expect(server.execute({
          name: 'calculate',
          params: {
            operation: 'divide',
            a: 5,
            b: 0
          }
        })).rejects.toThrow('Division by zero');
      });
    });

    describe('Storage Tool', () => {
      test('should store and retrieve values', async () => {
        const setResponse = await server.execute({
          name: 'storage-set',
          params: {
            key: 'test-key',
            value: 'test-value'
          }
        });
        expect(setResponse.content[0].text).toBe('Stored value for key: test-key');

        const getResponse = await server.execute({
          name: 'storage-get',
          params: {
            key: 'test-key'
          }
        });
        expect(getResponse.content[0].text).toBe('Value for key test-key: test-value');
      });

      test('should handle non-existent keys', async () => {
        await expect(server.execute({
          name: 'storage-get',
          params: {
            key: 'non-existent-key'
          }
        })).rejects.toThrow('Key not found');
      });
    });

    describe('Tavily Tool', () => {
      test('should perform search', async () => {
        const response = await server.execute({
          name: 'tavily-search',
          params: {
            query: 'test query'
          }
        });
        expect(response.content[0].text).toBeDefined();
      });

      test('should extract content', async () => {
        const response = await server.execute({
          name: 'tavily-extract',
          params: {
            url: 'https://test.com'
          }
        });
        expect(response.content[0].text).toBeDefined();
      });
    });
  });
});
