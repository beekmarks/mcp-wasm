import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from '../server';
import { getRegisteredTools, getRegisteredResources, getToolHandler, getResourceHandler } from './test-helpers';

describe('MCP Server', () => {
  describe('Server Creation', () => {
    let server: McpServer;
    
    beforeEach(() => {
      server = createServer();
    });
    
    test('should create server instance', () => {
      expect(server).toBeInstanceOf(McpServer);
    });
    
    test('should register calculator tool', () => {
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty('calculate');
      expect(tools.calculate).toHaveProperty('callback');
    });
    
    test('should register storage tool', () => {
      const tools = getRegisteredTools(server);
      expect(tools).toHaveProperty('set-storage');
      expect(tools['set-storage']).toHaveProperty('callback');
    });
    
    test('should register storage resource', () => {
      const resources = getRegisteredResources(server);
      expect(resources).toHaveProperty('storage://{key}');
      expect(resources['storage://{key}']).toHaveProperty('readCallback');
    });
  });
  
  describe('Calculator Tool', () => {
    let server: McpServer;
    
    beforeEach(() => {
      server = createServer();
    });
    
    test('should add numbers correctly', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      const result = await calculatorTool.callback({
        operation: 'add',
        a: 5,
        b: 3
      });
      expect(result.content[0].text).toBe('8');
    });
    
    test('should subtract numbers correctly', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      const result = await calculatorTool.callback({
        operation: 'subtract',
        a: 5,
        b: 3
      });
      expect(result.content[0].text).toBe('2');
    });
    
    test('should multiply numbers correctly', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      const result = await calculatorTool.callback({
        operation: 'multiply',
        a: 5,
        b: 3
      });
      expect(result.content[0].text).toBe('15');
    });
    
    test('should divide numbers correctly', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      const result = await calculatorTool.callback({
        operation: 'divide',
        a: 6,
        b: 2
      });
      expect(result.content[0].text).toBe('3');
    });
    
    test('should handle division by zero', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      await expect(calculatorTool.callback({
        operation: 'divide',
        a: 6,
        b: 0
      })).rejects.toThrow('Division by zero');
    });
    
    test('should validate operation type', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      await expect(calculatorTool.callback({
        operation: 'invalid' as any,
        a: 5,
        b: 3
      })).rejects.toThrow();
    });
    
    test('should validate number inputs', async () => {
      const calculatorTool = getToolHandler(server, 'calculate');
      await expect(calculatorTool.callback({
        operation: 'add',
        a: 'not a number' as any,
        b: 3
      })).rejects.toThrow();
    });
  });
  
  describe('Storage Operations', () => {
    let server: McpServer;
    
    beforeEach(() => {
      server = createServer();
    });
    
    test('should store and retrieve values', async () => {
      const storageTool = getToolHandler(server, 'set-storage');
      const storageResource = getResourceHandler(server, 'storage://{key}');
      
      // Store value
      await storageTool.callback({
        key: 'test-key',
        value: 'test-value'
      });
      
      // Retrieve value
      const uri = new URL('storage://test-key');
      const result = await storageResource.readCallback(uri, { key: 'test-key' });
      expect(result.contents[0].text).toBe('test-value');
    });
    
    test('should handle missing keys', async () => {
      const storageResource = getResourceHandler(server, 'storage://{key}');
      
      const uri = new URL('storage://nonexistent');
      const result = await storageResource.readCallback(uri, { key: 'nonexistent' });
      expect(result.contents[0].text).toBe('Key not found');
    });
    
    test('should update existing values', async () => {
      const storageTool = getToolHandler(server, 'set-storage');
      const storageResource = getResourceHandler(server, 'storage://{key}');
      
      // Store initial value
      await storageTool.callback({
        key: 'test-key',
        value: 'initial-value'
      });
      
      // Update value
      await storageTool.callback({
        key: 'test-key',
        value: 'updated-value'
      });
      
      // Retrieve updated value
      const uri = new URL('storage://test-key');
      const result = await storageResource.readCallback(uri, { key: 'test-key' });
      expect(result.contents[0].text).toBe('updated-value');
    });
    
    test('should validate storage inputs', async () => {
      const storageTool = getToolHandler(server, 'set-storage');
      
      await expect(storageTool.callback({
        key: 123 as any,
        value: 'test-value'
      })).rejects.toThrow();
      
      await expect(storageTool.callback({
        key: 'test-key',
        value: null as any
      })).rejects.toThrow();
    });
  });
});
