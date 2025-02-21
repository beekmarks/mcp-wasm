import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/server/types';

// Create a shared storage instance
export const storage = new Map<string, string>();

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-wasm-poc',
    version: '1.0.0',
    implementation: 'wasm'
  });

  // Schemas
  const calculatorSchema = z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }).strict();

  const storageSchema = z.object({
    key: z.string(),
    value: z.string()
  }).strict();

  // Calculator tool
  server.tool('calculate', 'Perform basic arithmetic operations', calculatorSchema.shape, async (params, extra: RequestHandlerExtra) => {
    let result = 0;
    switch (params.operation) {
      case 'add':
        result = params.a + params.b;
        break;
      case 'subtract':
        result = params.a - params.b;
        break;
      case 'multiply':
        result = params.a * params.b;
        break;
      case 'divide':
        if (params.b === 0) throw new Error('Division by zero');
        result = params.a / params.b;
        break;
    }
    return {
      contents: [{ type: 'text', text: result.toString() }]
    };
  });

  // Storage tools
  server.tool('storage-set', 'Store a value in local storage', storageSchema.shape, async (params, extra: RequestHandlerExtra) => {
    storage.set(params.key, params.value);
    return {
      contents: [{ type: 'text', text: 'Value stored successfully' }]
    };
  });

  server.tool('storage-get', 'Get a value from local storage', z.object({ key: z.string() }).shape, async (params, extra: RequestHandlerExtra) => {
    const value = storage.get(params.key);
    if (!value) {
      throw new Error('Key not found');
    }
    return {
      contents: [{ type: 'text', text: value }]
    };
  });

  // Storage resource
  const template = {
    template: 'storage://local',
    parameters: {
      key: {
        type: 'string',
        description: 'Storage key'
      }
    }
  };

  server.resource('storage', template, async (uri: URL, extra: RequestHandlerExtra) => {
    const key = extra.variables?.key;
    if (!key) {
      throw new Error('Missing key parameter');
    }

    const value = storage.get(key);
    if (!value) {
      return {
        contents: [{ type: 'text', text: 'Key not found' }]
      };
    }
    
    return {
      contents: [{ type: 'text', text: value }]
    };
  });

  return server;
}
