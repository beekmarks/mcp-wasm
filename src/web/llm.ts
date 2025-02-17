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
  private systemPrompt = `You are a helpful AI assistant with access to tools. Follow these rules EXACTLY:
1. When using tools, you MUST use this EXACT format (do not modify or use different tags):
   <tool>calculate</tool>
   <params>{"operation": "add", "a": 5, "b": 3}</params>

2. For calculations, use these EXACT formats:
   - Addition: <tool>calculate</tool><params>{"operation": "add", "a": number1, "b": number2}</params>
   - Subtraction: <tool>calculate</tool><params>{"operation": "subtract", "a": number1, "b": number2}</params>
   - Multiplication: <tool>calculate</tool><params>{"operation": "multiply", "a": number1, "b": number2}</params>
   - Division: <tool>calculate</tool><params>{"operation": "divide", "a": number1, "b": number2}</params>

3. For storage operations, use these EXACT formats:
   - Set: <tool>storage-set</tool><params>{"key": "your-key", "value": "your-value"}</params>
   - Get: <tool>storage-get</tool><params>{"key": "your-key"}</params>

4. IMPORTANT:
   - Use EXACTLY these tool names: "calculate", "storage-set", "storage-get"
   - Always use valid JSON in params
   - Wait for tool results before continuing
   - Keep responses clear and concise
6. Do not include ASCII art or unnecessary formatting`;
  private modelStatusCallback: (status: string) => void;
  private currentResponse: string = '';

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
        "Phi-3.5-mini-instruct-q4f16_1-MLC-1k", // Using Phi-3.5 mini with 1k context window for lower resource usage
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

  private parseToolCalls(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const toolRegex = /<tool>(.*?)<\/tool>\s*<params>(.*?)<\/params>/gs;
    let match;

    while ((match = toolRegex.exec(text)) !== null) {
      try {
        const toolName = match[1].trim();
        const params = JSON.parse(match[2]);
        console.log('🛠️ Found tool call:', { toolName, params });
        toolCalls.push({ name: toolName, params });
      } catch (error) {
        console.error('❌ Error parsing tool call:', error);
      }
    }

    return toolCalls;
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<string[]> {
    const results: string[] = [];
    
    console.log('⚡ Executing tool calls:', toolCalls);
    
    for (const call of toolCalls) {
      try {
        console.log('🚀 Executing tool:', call.name, 'with params:', call.params);
        const result = await this.handleToolCall(call);
        console.log('✅ Tool returned:', result);
        results.push(`Tool ${call.name} returned: ${result}`);
      } catch (error) {
        console.error('❌ Tool execution failed:', error);
        results.push(`Tool ${call.name} failed: ${error}`);
      }
    }

    return results;
  }

  async processUserInput(userInput: string, streamCallback?: (text: string) => void): Promise<string> {
    try {
      if (!this.engine) {
        throw new Error("Model not initialized");
      }

      console.log('🎯 Processing user input:', userInput);

      // Add user message to history
      this.messages.push({ role: "user", content: userInput });
      this.currentResponse = '';
      let finalResponse = '';
      let lastToolCallIndex = 0;

      // Generate response with streaming
      for await (const chunk of await this.engine.chat.completions.create({
        messages: this.messages,
        temperature: 0.3,
        max_tokens: 800,
        stream: true
      })) {
        const content = chunk.choices[0]?.delta?.content || '';
        this.currentResponse += content;
        finalResponse += content;
        
        //console.log('📝 Current response:', this.currentResponse);
        
        // Only process tool calls if we have complete tags
        if (this.currentResponse.includes('</tool>') && this.currentResponse.includes('</params>')) {
          console.log('🔍 Checking for tool calls in:', this.currentResponse.slice(lastToolCallIndex));
          const toolCalls = this.parseToolCalls(this.currentResponse.slice(lastToolCallIndex));
          
          if (toolCalls.length > 0) {
            console.log('🛠️ Found tool calls:', toolCalls);
            
            // Execute tool calls and get results
            const toolResults = await this.executeToolCalls(toolCalls);
            console.log('✨ Tool results:', toolResults);
            
            // Add tool results to the conversation
            for (const result of toolResults) {
              this.messages.push({ role: "assistant", content: result });
            }
            
            // Update the last processed position
            lastToolCallIndex = this.currentResponse.length;
            
            if (streamCallback) {
              streamCallback(this.currentResponse + '\n' + toolResults.join('\n'));
            }
          }
        }
        
        // Always stream the current chunk
        if (streamCallback) {
          streamCallback(this.currentResponse);
        }
      }

      console.log('🏁 Final response:', finalResponse);

      // Process any remaining tool calls in the final response
      if (finalResponse.includes('</tool>') && finalResponse.includes('</params>')) {
        console.log('🔍 Checking for remaining tool calls in:', finalResponse.slice(lastToolCallIndex));
        const remainingToolCalls = this.parseToolCalls(finalResponse.slice(lastToolCallIndex));
        if (remainingToolCalls.length > 0) {
          console.log('🛠️ Processing remaining tool calls:', remainingToolCalls);
          const toolResults = await this.executeToolCalls(remainingToolCalls);
          console.log('✨ Final tool results:', toolResults);
          for (const result of toolResults) {
            this.messages.push({ role: "assistant", content: result });
            finalResponse += '\n' + result;
          }
        }
      }

      // Add assistant's final response to history
      this.messages.push({ role: "assistant", content: finalResponse });

      return finalResponse;
    } catch (error) {
      console.error('❌ Error processing input:', error);
      throw error;
    }
  }

  private async handleToolCall(toolCall: { name: string; params: any }) {
    const toolName = toolCall.name;
    const params = toolCall.params;

    try {
      console.log('📡 Sending tool request via MCP:', { toolName, params });
      await this.transport.send({
        jsonrpc: '2.0',
        method: 'tool',
        id: Date.now(),
        params: {
          name: toolName,
          params: params
        },
      });

      const response = this.transport.getLastResponse();
      if (!response) {
        throw new Error('No response received from tool');
      }

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.result?.contents?.[0]?.text;
      if (!result) {
        throw new Error('Invalid response format from tool');
      }

      console.log('📨 Tool response:', result);
      return result;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
