import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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
  const storage = new Map<string, string>();
  server.resource(
    "storage",
    "storage://{key}",
    async (uri, { key }) => ({
      contents: [{
        uri: uri.href,
        text: storage.get(key) || "Key not found"
      }]
    })
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

  return server;
}
