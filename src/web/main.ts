import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from './browser-transport';
import { createServer } from './server';

let mcpServer: McpServer | null = null;
let transport: BrowserTransport;
let serverInitialized = false;

async function initializeMcpServer() {
  try {
    transport = new BrowserTransport();
    await transport.start();
    
    mcpServer = createServer();
    console.log('Server created:', mcpServer);
    console.log('Registered tools:', mcpServer?._registeredTools);
    console.log('Registered resources:', mcpServer?._registeredResources);
    
    await mcpServer.connect(transport);
    serverInitialized = true;
    
    console.log('MCP Server initialized successfully');
    console.log('Server after connection:', mcpServer);
    console.log('Registered resources after connection:', mcpServer?._registeredResources);
    
    // Enable buttons once server is ready
    document.querySelectorAll('button').forEach(button => {
      button.disabled = false;
    });
  } catch (error) {
    console.error('Failed to initialize MCP server:', error);
    // Show error on the page
    const outputs = document.querySelectorAll('.output');
    outputs.forEach(output => {
      output.textContent = `Failed to initialize MCP server: ${error}`;
    });
  }
}

// Initialize when the page loads
window.addEventListener('load', () => {
  // Disable buttons until server is ready
  document.querySelectorAll('button').forEach(button => {
    button.disabled = true;
  });
  
  initializeMcpServer();
});

// Calculator function
async function calculate() {
  if (!serverInitialized || !mcpServer) {
    const output = document.getElementById('calcOutput');
    if (output) {
      output.textContent = 'Error: Server not initialized';
    }
    return;
  }

  const operation = (document.getElementById('operation') as HTMLSelectElement).value;
  const a = parseFloat((document.getElementById('num1') as HTMLInputElement).value);
  const b = parseFloat((document.getElementById('num2') as HTMLInputElement).value);
  
  try {
    // Get the registered tool handler
    const toolHandler = mcpServer._registeredTools['calculate'];
    if (!toolHandler) {
      throw new Error('Calculator tool not found');
    }
    
    const result = await toolHandler.callback({
      operation,
      a,
      b
    });
    
    const output = document.getElementById('calcOutput');
    if (output) {
      output.textContent = `Result: ${result.content[0].text}`;
    }
  } catch (error: any) {
    console.error('Calculator error:', error);
    const output = document.getElementById('calcOutput');
    if (output) {
      output.textContent = `Error: ${error.message}`;
    }
  }
}

// Storage functions
async function setStorage() {
  if (!serverInitialized || !mcpServer) {
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = 'Error: Server not initialized';
    }
    return;
  }

  const key = (document.getElementById('storageKey') as HTMLInputElement).value;
  const value = (document.getElementById('storageValue') as HTMLInputElement).value;
  
  try {
    const toolHandler = mcpServer._registeredTools['set-storage'];
    if (!toolHandler) {
      throw new Error('Storage tool not found');
    }
    
    const result = await toolHandler.callback({ key, value });
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = result.content[0].text;
    }
  } catch (error: any) {
    console.error('Storage error:', error);
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = `Error: ${error.message}`;
    }
  }
}

async function getStorage() {
  if (!serverInitialized || !mcpServer) {
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = 'Error: Server not initialized';
    }
    return;
  }

  const key = (document.getElementById('storageKey') as HTMLInputElement).value;
  
  try {
    console.log('Getting storage for key:', key);
    console.log('Available resources:', mcpServer._registeredResources);
    
    // Get the template resource handler
    const resourceHandler = mcpServer._registeredResources['storage://{key}'];
    if (!resourceHandler) {
      throw new Error('Storage resource not found');
    }
    
    console.log('Found resource handler:', resourceHandler);
    
    // Create a mock URI for the resource
    const uri = new URL(`storage://${key}`);
    
    // Call the readCallback with both the URI and params object
    const result = await resourceHandler.readCallback(uri, { key });
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = result.contents[0].text;
    }
  } catch (error: any) {
    console.error('Storage error:', error);
    const output = document.getElementById('storageOutput');
    if (output) {
      output.textContent = `Error: ${error.message}`;
    }
  }
}

// Export functions to window
window.calculate = calculate;
window.setStorage = setStorage;
window.getStorage = getStorage;

// Add to window type
declare global {
  interface Window {
    calculate: () => Promise<void>;
    setStorage: () => Promise<void>;
    getStorage: () => Promise<void>;
  }
}
