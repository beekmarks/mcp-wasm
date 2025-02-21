import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TavilyService } from "../web/services/tavily";
import { config, validateConfig } from "../web/config";

// Create a shared storage instance
export const storage = new Map<string, string>();

// Create the MCP server instance
export function createServer(): McpServer {
  const server = new McpServer({
    name: "WASM MCP Server",
    version: "1.0.0"
  });

  // Add a simple calculator tool
  server.tool(
    "calculate",
    {
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number(),
      b: z.number()
    },
    async ({ operation, a, b }) => {
      let result: number;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) throw new Error("Division by zero");
          result = a / b;
          break;
      }
      return {
        content: [{ type: "text", text: String(result) }]
      };
    }
  );

  // Add a simple storage resource
  server.resource(
    "storage",
    "mc://storage/{key}",
    async (uri) => {
      console.log('Resource URI:', uri);
      console.log('Resource pathname:', uri.pathname);
      const key = uri.pathname.replace('/storage/', '');
      console.log('Extracted key:', key);
      console.log('Storage contents:', Array.from(storage.entries()));
      const value = storage.get(key);
      console.log('Retrieved value:', value);
      return {
        contents: [{
          uri: uri.href,
          text: value || "Key not found"
        }]
      };
    }
  );

  // Add a storage tool
  server.tool(
    "set-storage",
    {
      key: z.string(),
      value: z.string()
    },
    async ({ key, value }) => {
      storage.set(key, value);
      return {
        content: [{ type: "text", text: `Stored value at key: ${key}` }]
      };
    }
  );

  // Add Tavily search tool
  server.tool(
    "tavily-search",
    {
      query: z.string(),
      search_depth: z.enum(["basic", "advanced"]).optional(),
      include_answer: z.union([z.boolean(), z.enum(["basic", "advanced"])]).optional(),
      max_results: z.number().min(1).max(20).optional(),
      include_raw_content: z.boolean().optional(),
      include_images: z.boolean().optional(),
      category: z.enum(["general", "news"]).optional()
    },
    async (params) => {
      try {
        console.log(' WASM Server: Received Tavily search request:', params);
        
        // Validate config before using the API key
        console.log(' WASM Server: Validating config...');
        validateConfig();
        console.log(' WASM Server: Config validated');
        
        console.log(' WASM Server: Creating Tavily service...');
        const tavilyService = new TavilyService(config.tavilyApiKey);
        console.log(' WASM Server: Tavily service created');
        
        console.log(' WASM Server: Executing search...');
        const results = await tavilyService.search(params);
        console.log(' WASM Server: Search completed:', results);
        
        // Format the response as JSON string to match our UI expectations
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results)  // Return raw JSON for the UI to parse
          }]
        };
      } catch (error) {
        console.error(' WASM Server: Tavily search error:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error performing search: ${error.message}` 
          }]
        };
      }
    }
  );

  return server;
}
