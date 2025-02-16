import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Helper to access private properties for testing
export function getPrivateProperty(obj: any, prop: string) {
  return obj[prop];
}

// Helper to get registered tools
export function getRegisteredTools(server: McpServer) {
  return getPrivateProperty(server, '_registeredTools');
}

// Helper to get registered resources
export function getRegisteredResources(server: McpServer) {
  return getPrivateProperty(server, '_registeredResources');
}

// Helper to get tool handler
export function getToolHandler(server: McpServer, toolName: string) {
  const tools = getRegisteredTools(server);
  return tools[toolName];
}

// Helper to get resource handler
export function getResourceHandler(server: McpServer, resourcePath: string) {
  const resources = getRegisteredResources(server);
  return resources[resourcePath];
}

// Tests for test helpers
describe('Test Helpers', () => {
  const mockServer = {
    _registeredTools: {
      test: { callback: () => {} }
    },
    _registeredResources: {
      'test://{param}': { readCallback: () => {} }
    }
  };

  test('getPrivateProperty should access private properties', () => {
    const tools = getPrivateProperty(mockServer, '_registeredTools');
    expect(tools).toBeDefined();
    expect(tools.test).toBeDefined();
  });

  test('getRegisteredTools should return tools', () => {
    const tools = getRegisteredTools(mockServer as any);
    expect(tools).toBeDefined();
    expect(tools.test).toBeDefined();
  });

  test('getRegisteredResources should return resources', () => {
    const resources = getRegisteredResources(mockServer as any);
    expect(resources).toBeDefined();
    expect(resources['test://{param}']).toBeDefined();
  });

  test('getToolHandler should return specific tool', () => {
    const tool = getToolHandler(mockServer as any, 'test');
    expect(tool).toBeDefined();
    expect(tool.callback).toBeDefined();
  });

  test('getResourceHandler should return specific resource', () => {
    const resource = getResourceHandler(mockServer as any, 'test://{param}');
    expect(resource).toBeDefined();
    expect(resource.readCallback).toBeDefined();
  });
});
