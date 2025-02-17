import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from './browser-transport';
import { createServer } from './server';
import { LLMHandler } from './llm';

interface ToolResponse {
  result?: {
    contents?: Array<{
      type: string;
      text: string;
    }>;
  };
}

async function setupEnvironment() {
  const transport = new BrowserTransport();
  console.log('Browser transport initialized');

  const server = await createServer();
  await transport.start();
  await server.connect(transport);

  return { transport, server };
}

async function initializeCalculator(transport: BrowserTransport) {
  const operationSelect = document.getElementById('operation') as HTMLSelectElement;
  const num1Input = document.getElementById('num1') as HTMLInputElement;
  const num2Input = document.getElementById('num2') as HTMLInputElement;
  const calculateButton = document.getElementById('calculate');
  const resultDiv = document.getElementById('result');

  if (!operationSelect || !num1Input || !num2Input || !calculateButton || !resultDiv) {
    throw new Error('Calculator UI elements not found');
  }

  calculateButton.addEventListener('click', async () => {
    const operation = operationSelect.value;
    const num1 = parseFloat(num1Input.value);
    const num2 = parseFloat(num2Input.value);

    if (isNaN(num1) || isNaN(num2)) {
      resultDiv.textContent = 'Please enter valid numbers';
      return;
    }

    try {
      await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: Date.now(),
        params: {
          name: 'calculate',
          params: {
            operation,
            a: num1,
            b: num2,
          },
        },
      });

      // Get the response from transport
      const response = transport.getLastResponse();
      const result = response?.result?.contents?.[0]?.text || 'Operation failed';
      resultDiv.textContent = `Result: ${result}`;
    } catch (error) {
      resultDiv.textContent = `Error: ${error}`;
    }
  });
}

async function initializeStorage(transport: BrowserTransport) {
  const keyInput = document.getElementById('key') as HTMLInputElement;
  const valueInput = document.getElementById('value') as HTMLInputElement;
  const setButton = document.getElementById('set');
  const getButton = document.getElementById('get');
  const resultDiv = document.getElementById('storage-result');

  if (!keyInput || !valueInput || !setButton || !getButton || !resultDiv) {
    throw new Error('Storage UI elements not found');
  }

  setButton.addEventListener('click', async () => {
    const key = keyInput.value;
    const value = valueInput.value;

    if (!key || !value) {
      resultDiv.textContent = 'Please enter both key and value';
      return;
    }

    try {
      await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: Date.now(),
        params: {
          name: 'storage-set',
          params: {
            key,
            value,
          },
        },
      });

      const response = transport.getLastResponse();
      const result = response?.result?.contents?.[0]?.text || 'Operation failed';
      resultDiv.textContent = result;
    } catch (error) {
      resultDiv.textContent = `Error: ${error}`;
    }
  });

  getButton.addEventListener('click', async () => {
    const key = keyInput.value;

    if (!key) {
      resultDiv.textContent = 'Please enter a key';
      return;
    }

    try {
      await transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: Date.now(),
        params: {
          name: 'storage-get',
          params: {
            key
          }
        },
      });

      const response = transport.getLastResponse();
      const result = response?.result?.contents?.[0]?.text || 'Key not found';
      resultDiv.textContent = result;
    } catch (error) {
      resultDiv.textContent = `Error: ${error}`;
    }
  });
}

async function initializeLLM(transport: BrowserTransport, server: McpServer) {
  const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement;
  const sendButton = document.getElementById('sendButton');
  const chatOutput = document.getElementById('chatOutput');
  const modelStatus = document.getElementById('modelStatus');
  const modelStatusText = document.getElementById('modelStatusText');

  if (!chatInput || !sendButton || !chatOutput || !modelStatus || !modelStatusText) {
    throw new Error('Chat UI elements not found');
  }

  const llmHandler = new LLMHandler(
    transport,
    server,
    (status: string) => {
      if (modelStatusText) {
        modelStatusText.textContent = status;
        modelStatus.style.display = 'block';
      }
    }
  );

  // Initialize LLM
  try {
    await llmHandler.initialize();
  } catch (error) {
    console.error('Error initializing LLM:', error);
    modelStatusText.textContent = `Error: ${error}`;
    return;
  }

  sendButton.addEventListener('click', async () => {
    const input = chatInput.value.trim();
    if (!input) return;

    // Clear input
    chatInput.value = '';

    // Add user message to chat
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.textContent = input;
    chatOutput.appendChild(userDiv);

    try {
      // Get AI response
      const response = await llmHandler.processUserInput(
        input,
        (text: string) => {
          // Update assistant message
          let assistantDiv = chatOutput.querySelector('.message.assistant:last-child');
          if (!assistantDiv) {
            assistantDiv = document.createElement('div');
            assistantDiv.className = 'message assistant';
            chatOutput.appendChild(assistantDiv);
          }
          assistantDiv.textContent = text;
          chatOutput.scrollTop = chatOutput.scrollHeight;
        }
      );
    } catch (error) {
      console.error('Error processing input:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message error';
      errorDiv.textContent = `Error: ${error}`;
      chatOutput.appendChild(errorDiv);
    }

    // Scroll to bottom
    chatOutput.scrollTop = chatOutput.scrollHeight;
  });

  // Handle enter key
  chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendButton.click();
    }
  });
}

async function main() {
  const { transport, server } = await setupEnvironment();
  await initializeCalculator(transport);
  await initializeStorage(transport);
  await initializeLLM(transport, server);
}

main().catch(console.error);
