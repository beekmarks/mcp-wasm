import { CreateMLCEngine, MLCEngine, ChatCompletion, ChatCompletionChunk } from "@mlc-ai/web-llm";
import { BrowserTransport } from "./browser-transport";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolCall {
  name: string;
  params: any;
}

export class LLMHandler {
  private engine: MLCEngine | null = null;
  private transport: BrowserTransport;
  private server: McpServer;
  private messages: Message[] = [];
  private systemPrompt = `You are a helpful AI assistant with access to tools. You MUST use tools when appropriate. Follow these rules EXACTLY:

1. For ANY questions about current information, weather, news, or facts, ALWAYS use:
   <tool>tavily-search</tool>
   <params>{
     "query": "your search query",
     "searchDepth": "advanced"
   }</params>

2. For calculations, use:
   <tool>calculate</tool>
   <params>{"operation": "add|subtract|multiply|divide", "a": number1, "b": number2}</params>

3. For storage operations, use:
   <tool>storage-set</tool>
   <params>{"key": "your-key", "value": "your-value"}</params>
   <tool>storage-get</tool>
   <params>{"key": "your-key"}</params>

Remember: ALWAYS use tavily-search for current information. Do not try to answer from your own knowledge.`;
  private modelStatusCallback: (status: string) => void;
  private currentResponse: string = '';
  private currentToolCalls: any[] = [];
  private toolCallBuffer: string = '';
  private resolveToolCalls: () => void = () => {};

  constructor(transport: BrowserTransport, server: McpServer, modelStatusCallback: (status: string) => void) {
    this.transport = transport;
    this.server = server;
    this.modelStatusCallback = modelStatusCallback;
    // Initialize with system prompt
    this.messages.push({ role: "system", content: this.systemPrompt });
  }

  async initialize() {
    try {
      this.modelStatusCallback("Initializing model...");
      
      // Create engine with progress callback
      this.engine = await CreateMLCEngine(
        "Hermes-3-Llama-3.1-8B-q4f16_1-MLC", // Using Hermes 3 for better tool calling
        {
          initProgressCallback: (progress) => {
            this.modelStatusCallback(`Loading model: ${Math.round(progress.progress * 100)}%`);
          }
        }
      );

      this.modelStatusCallback("Model ready");
      return true;
    } catch (error) {
      console.error('Error initializing model:', error);
      this.modelStatusCallback(`Error: ${error}`);
      throw error;
    }
  }

  async processUserInput(input: string, onProgress: (text: string) => void): Promise<void> {
    console.log('🎯 Processing user input:', input);

    try {
      if (!this.engine) {
        throw new Error('LLM engine not initialized');
      }

      // Add user message
      const messages = [
        { role: "system" as const, content: this.systemPrompt },
        { role: "user" as const, content: input }
      ];

      // Generate response using WebLLM
      const response = await this.engine.chatCompletion({
        messages,
        stream: false,
        max_tokens: 800,
        temperature: 0.7
      });

      console.log('🤖 LLM Response:', response);

      // Parse the tool call from the LLM response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('❌ No content in LLM response');
        onProgress('I apologize, but I was unable to process your request properly.');
        return;
      }

      const toolMatch = content.match(/<tool>(.*?)<\/tool>\s*<params>(.*?)<\/params>/s);
      if (!toolMatch) {
        console.error('❌ No tool call found in LLM response:', content);
        onProgress('I apologize, but I was unable to process your request properly.');
        return;
      }

      // Extract tool name and parameters
      const [_, toolName, paramsStr] = toolMatch;
      let params;
      try {
        params = JSON.parse(paramsStr);
      } catch (e) {
        console.error('❌ Error parsing tool params:', e);
        onProgress('I apologize, but I was unable to process your request properly.');
        return;
      }

      console.log('🛠️ Selected tool:', toolName, 'with params:', params);

      // Call the selected tool
      console.log('🛠️ Sending tool request:', {
        name: toolName,
        params: params
      });
      
      const toolResponse = await this.transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: Date.now(),
        params: {
          name: toolName,
          params
        }
      });

      console.log('🛠️ Received tool response:', JSON.stringify(toolResponse, null, 2));

      // Process the tool response
      if (toolResponse.result?.contents?.[0]?.text) {
        onProgress(toolResponse.result.contents[0].text);
      } else if (toolResponse.error) {
        console.error('❌ Tool execution error:', toolResponse.error);
        onProgress(`Error: ${toolResponse.error.message}`);
      } else {
        console.error('❌ Invalid tool response format:', toolResponse);
        onProgress('I apologize, but I encountered an error processing your request.');
      }
    } catch (error) {
      console.error('❌ Error processing input:', error);
      onProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
