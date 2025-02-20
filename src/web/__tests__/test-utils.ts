import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from '../browser-transport';
import { createServer } from '../server';
import { getToolHandler, getResourceHandler } from './test-helpers';

let testEnvironment: { transport: BrowserTransport; server: McpServer } | null = null;

export async function setupTestEnvironment() {
  if (testEnvironment) {
    await testEnvironment.transport.stop();
  }

  const transport = new BrowserTransport(false); // Disable test mode to use actual handlers
  const server = createServer();

  await transport.start();
  await server.connect(transport);

  testEnvironment = { transport, server };
  return testEnvironment;
}

export function setupCalculatorUI() {
  document.body.innerHTML = `
    <div>
      <input id="num1" type="number" />
      <input id="num2" type="number" />
      <select id="operation">
        <option value="add">Add</option>
        <option value="subtract">Subtract</option>
        <option value="multiply">Multiply</option>
        <option value="divide">Divide</option>
      </select>
      <button id="calcButton">Calculate</button>
      <div id="calcOutput"></div>
    </div>
  `;

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
      const { transport } = testEnvironment!;
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

export function setupStorageUI() {
  document.body.innerHTML = `
    <div>
      <input id="storageKey" type="text" />
      <input id="storageValue" type="text" />
      <button id="setStorageButton">Set</button>
      <button id="getStorageButton">Get</button>
      <div id="storageOutput"></div>
    </div>
  `;

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
      const { transport } = testEnvironment!;
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
      const { transport } = testEnvironment!;
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

describe('Test Utils', () => {
  test('setupTestEnvironment should create transport and server', async () => {
    const env = await setupTestEnvironment();
    expect(env.transport).toBeInstanceOf(BrowserTransport);
    expect(env.server).toBeInstanceOf(McpServer);
    expect(env.transport.isConnected()).toBe(true);
  });
});
