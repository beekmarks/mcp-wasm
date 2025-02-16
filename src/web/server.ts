import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const calculatorSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number()
});

const storageSchema = z.object({
  key: z.string(),
  value: z.string()
});

// In-memory storage
const storage = new Map<string, string>();

export function createServer(): McpServer {
  const server = new McpServer({
    name: "WASM MCP Server",
    version: "1.0.0"
  });

  // Register calculator tool
  server.tool(
    "calculate",
    calculatorSchema.shape,
    async (params) => {
      // Parse and validate inputs
      const result = calculatorSchema.safeParse(params);
      if (!result.success) {
        throw new Error('Invalid input parameters');
      }

      const { operation, a, b } = result.data;
      let value: number;
      
      switch (operation) {
        case 'add':
          value = a + b;
          break;
        case 'subtract':
          value = a - b;
          break;
        case 'multiply':
          value = a * b;
          break;
        case 'divide':
          if (b === 0) throw new Error('Division by zero');
          value = a / b;
          break;
        default:
          throw new Error('Invalid operation');
      }

      return {
        content: [{ type: "text", text: value.toString() }]
      };
    }
  );

  // Register storage tool
  server.tool(
    "set-storage",
    storageSchema.shape,
    async (params) => {
      // Parse and validate inputs
      const result = storageSchema.safeParse(params);
      if (!result.success) {
        throw new Error('Invalid input parameters');
      }

      const { key, value } = result.data;
      storage.set(key, value);
      
      return {
        content: [{ type: "text", text: 'Value stored successfully' }]
      };
    }
  );

  // Register storage resource
  server.resource(
    "storage",
    "storage://{key}",
    async (uri: URL, extra: any) => {
      const key = extra.key;
      if (!key) {
        throw new Error('Missing key parameter');
      }

      const value = storage.get(key);
      if (!value) {
        return {
          contents: [{
            uri: uri.toString(),
            text: 'Key not found'
          }]
        };
      }
      
      return {
        contents: [{
          uri: uri.toString(),
          text: value
        }]
      };
    }
  );

  return server;
}
