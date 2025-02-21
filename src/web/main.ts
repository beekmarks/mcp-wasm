import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserTransport } from './browser-transport';
import { createServer } from './server';
import { LLMHandler } from './llm';
import { validateConfig, config } from './config';
import { TavilyService } from './services/tavily';

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
          console.log('🤖 AI Response Text:', text);
          
          try {
            // Try to parse the response as JSON
            const searchData = JSON.parse(text);
            console.log('🔍 Parsed Search Data:', searchData);
            
            // Create a new message div for this response
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            
            // Add AI-generated answer if available
            if (searchData.answer) {
              console.log('📝 Displaying answer:', searchData.answer);
              messageDiv.textContent = searchData.answer;
            } else {
              console.log('📝 No answer found, displaying raw text:', text);
              messageDiv.textContent = text;
            }

            // Add the message to the chat
            chatOutput.appendChild(messageDiv);
          } catch (e) {
            // If parsing fails, treat it as regular text
            console.log('📝 Failed to parse JSON, displaying as text:', text);
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';
            messageDiv.textContent = text;
            chatOutput.appendChild(messageDiv);
          }
          
          // Scroll to bottom
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
  try {
    // Validate environment variables
    validateConfig();

    const { transport, server } = await setupEnvironment();
    await initializeCalculator(transport);
    await initializeStorage(transport);
    await initializeLLM(transport, server);

    // Listen for messages from the browser transport
    window.addEventListener('message', async (event) => {
      // Only handle tool requests
      if (event.data?.type !== 'mcp-tool-request') {
        return;
      }

      console.log('🔄 WASM: Received tool request:', event.data);
      
      try {
        const { message } = event.data;
        const toolName = message.params.name;
        const toolParams = message.params.params;
        
        console.log('🔧 WASM: Executing tool:', toolName, 'with params:', toolParams);
        
        if (toolName === 'tavily-search') {
          try {
            console.log('🔍 WASM: Validating config...');
            validateConfig();
            console.log('✅ WASM: Config validated');

            console.log('🚀 WASM: Creating Tavily service...');
            const tavilyService = new TavilyService(config.tavilyApiKey);
            console.log('✅ WASM: Tavily service created');

            console.log('🔎 WASM: Executing search...');
            const results = await tavilyService.search(toolParams);
            console.log('✅ WASM: Search completed:', results);

            // Return just the answer and query to keep the response focused
            const response = {
              answer: results.answer,
              query: results.query
            };

            // Send the response back to the browser transport
            window.postMessage({
              type: 'mcp-tool-response',
              id: message.id,
              response: {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  contents: [{
                    type: 'text',
                    text: JSON.stringify(response)
                  }]
                }
              }
            }, '*');
            
            console.log('✅ WASM: Response sent:', response);
          } catch (error) {
            console.error('❌ WASM: Tavily search error:', error);
            window.postMessage({
              type: 'mcp-tool-response',
              id: message.id,
              response: {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  message: error.message
                }
              }
            }, '*');
          }
          return;
        }

        let response;
        
        switch (toolName) {
          case 'calculate': {
            try {
              console.log('🔢 WASM: Executing calculation...');
              const { operation, a, b } = toolParams;
              
              let result: number;
              switch (operation) {
                case 'add':
                  result = a + b;
                  break;
                case 'subtract':
                  result = a - b;
                  break;
                case 'multiply':
                  result = a * b;
                  break;
                case 'divide':
                  if (b === 0) throw new Error('Division by zero');
                  result = a / b;
                  break;
                default:
                  throw new Error(`Unknown operation: ${operation}`);
              }
              
              console.log('✅ WASM: Calculation completed:', result);
              
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  contents: [{
                    type: "text",
                    text: result.toString()
                  }]
                }
              };
            } catch (error) {
              console.error('❌ WASM: Calculate error:', error);
              throw error;
            }
            break;
          }

          case 'storage-set': {
            try {
              console.log('💾 WASM: Setting storage value...');
              const { key, value } = toolParams;
              
              if (!key) {
                throw new Error('Key is required');
              }
              
              localStorage.setItem(key, value);
              console.log('✅ WASM: Storage value set:', { key, value });
              
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  contents: [{
                    type: "text",
                    text: `Value stored successfully at key: ${key}`
                  }]
                }
              };
            } catch (error) {
              console.error('❌ WASM: Storage set error:', error);
              throw error;
            }
            break;
          }

          case 'storage-get': {
            try {
              console.log('🔍 WASM: Getting storage value...');
              const { key } = toolParams;
              
              if (!key) {
                throw new Error('Key is required');
              }
              
              const value = localStorage.getItem(key);
              if (value === null) {
                throw new Error(`Key not found: ${key}`);
              }
              
              console.log('✅ WASM: Storage value retrieved:', { key, value });
              
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  contents: [{
                    type: "text",
                    text: value
                  }]
                }
              };
            } catch (error) {
              console.error('❌ WASM: Storage get error:', error);
              throw error;
            }
            break;
          }
          
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
        
        // Send the response back to the browser transport
        window.postMessage({
          type: 'mcp-tool-response',
          id: message.id,
          response
        }, '*');
      } catch (error) {
        console.error('❌ WASM: Error handling tool request:', error);
        // Send error response
        window.postMessage({
          type: 'mcp-tool-response',
          id: event.data.id,
          response: {
            jsonrpc: '2.0',
            id: event.data.message.id,
            error: {
              code: -32000,
              message: error.message
            }
          }
        }, '*');
      }
    });
  } catch (error) {
    console.error('Initialization error:', error);
    // Display error in the UI
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.textContent = `Error: ${error.message}`;
    document.body.prepend(errorDiv);
  }
}

main().catch(console.error);
