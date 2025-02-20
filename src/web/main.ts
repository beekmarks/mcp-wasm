import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from './browser-transport';
import { createServer } from './server';

async function setupEnvironment() {
  const transport = new BrowserTransport();
  await transport.start();
  
  const server = createServer();
  await server.connect(transport);
  
  return { server, transport };
}

async function initializeCalculator(transport: BrowserTransport) {
  const calcButton = document.getElementById('calcButton');
  const output = document.getElementById('calcOutput');
  
  if (!calcButton || !output) {
    throw new Error('Calculator UI elements not found');
  }
  
  calcButton.addEventListener('click', async () => {
    const operation = (document.getElementById('operation') as HTMLSelectElement).value;
    const a = parseFloat((document.getElementById('num1') as HTMLInputElement).value);
    const b = parseFloat((document.getElementById('num2') as HTMLInputElement).value);
    
    try {
      const message = {
        jsonrpc: "2.0" as const,
        method: "tool",
        id: 1,
        params: {
          name: "calculate",
          params: {
            operation,
            a,
            b
          }
        }
      };
      
      transport.onMessage((response) => {
        if (response.result && response.result.content) {
          output.textContent = `Result: ${response.result.content[0].text}`;
        } else if (response.error) {
          output.textContent = `Error: ${response.error.message}`;
        }
      });
      
      await transport.send(message);
    } catch (error) {
      output.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  });
}

async function initializeStorage(transport: BrowserTransport) {
  const setButton = document.getElementById('setStorageButton');
  const getButton = document.getElementById('getStorageButton');
  const output = document.getElementById('storageOutput');
  
  if (!setButton || !getButton || !output) {
    throw new Error('Storage UI elements not found');
  }
  
  setButton.addEventListener('click', async () => {
    const key = (document.getElementById('storageKey') as HTMLInputElement).value;
    const value = (document.getElementById('storageValue') as HTMLInputElement).value;
    
    try {
      const message = {
        jsonrpc: "2.0" as const,
        method: "tool",
        id: 1,
        params: {
          name: "set-storage",
          params: {
            key,
            value
          }
        }
      };
      
      transport.onMessage((response) => {
        if (response.result && response.result.content) {
          output.textContent = response.result.content[0].text;
        } else if (response.error) {
          output.textContent = `Error: ${response.error.message}`;
        }
      });
      
      await transport.send(message);
    } catch (error) {
      output.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  });
  
  getButton.addEventListener('click', async () => {
    const key = (document.getElementById('storageKey') as HTMLInputElement).value;

    try {
      const message = {
        jsonrpc: "2.0" as const,
        method: "resource",
        id: 2,
        params: {
          uri: `storage://${key}`,
          key
        }
      };

      transport.onMessage((response) => {
        if (response.result && response.result.contents) {
          output.textContent = response.result.contents[0].text;
        } else if (response.error) {
          output.textContent = `Error: ${response.error.message}`;
        }
      });

      await transport.send(message);
    } catch (error) {
      output.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  });
}

async function main() {
  const { transport } = await setupEnvironment();
  await initializeCalculator(transport);
  await initializeStorage(transport);
}

main().catch(console.error);
