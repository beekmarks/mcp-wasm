# WASM MCP Server

A proof-of-concept implementation of a Model Context Protocol (MCP) server that runs in WebAssembly (WASM) within a web browser. This project demonstrates the integration of MCP tools and resources in a browser environment.

## Features

### Calculator Tool
- Performs basic arithmetic operations (addition, subtraction, multiplication, division)
- Input validation and error handling for:
  - Division by zero
  - Invalid numeric inputs
  - Parameter validation
- Real-time calculation results with proper error messages
- Integration with LLM for natural language queries

### Storage System
- Key-value storage functionality
- Set and retrieve values using string keys (`storage-set` and `storage-get`)
- Persistent storage within the browser session
- Proper error handling for:
  - Missing keys
  - Invalid parameters
  - Unknown tool names
- Template-based resource handling

## Technical Implementation

### Server Components
- `server.ts`: Core MCP server implementation with tool and resource definitions
- `main.ts`: Client-side integration and UI interaction handling
- `browser-transport.ts`: Custom transport layer for browser communication
- `llm.ts`: LLM integration for natural language processing

### Architecture
- Uses the Model Context Protocol SDK for server implementation
- Implements a custom browser transport layer
- Tools are registered with callback functions
- Resources use template paths with parameter substitution
- LLM integration for natural language understanding

### Key Concepts
1. **Tools**
   - Registered using `server.tool()`
   - Execute via callback functions
   - Schema validation using Zod
   - Error handling with descriptive messages

2. **Resources**
   - Template-based paths (e.g., `storage://{key}`)
   - Accessed via `readCallback`
   - Parameterized resource handling
   - Proper error handling for missing resources

3. **LLM Integration**
   - Natural language processing for user queries
   - Tool selection and parameter extraction
   - Response formatting and error handling
   - System prompts for consistent behavior

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A modern web browser with WebGPU support (Chrome Canary or Edge Canary with WebGPU flag enabled)

### Clone the Repository

```bash
git clone https://github.com/beekmarks/mcp-wasm.git
cd mcp-wasm
```

### Install Dependencies

```bash
npm install
```

### Build the Application

```bash
npm run build
```

### Run the Development Server

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`. Open this URL in your WebGPU-enabled browser.

### Running Tests

```bash
npm test
```

To run tests with coverage:

```bash
npm run test:coverage
```

## Usage

1. Once the application is running, you'll see a text input field and a submit button.

2. **Important**: When you first load the application, it will need to download and initialize the LLM model. This may take a few moments depending on your internet connection. Wait for the status indicator to show "Model Ready" before submitting any queries. The model download is approximately 100MB and only needs to be done once per browser session.

### About the Model

This application uses a quantized version of the Phi-3.5-mini-instruct model, optimized for running in the browser via WebGPU. Due to browser limitations and the need for efficient client-side processing, we use a 4-bit quantized model with a 1k context window, which allows it to run efficiently in the browser while maintaining reasonable performance.

**Note on Model Limitations:**
- The quantized model may occasionally produce responses that are less accurate or coherent than the full model
- Complex queries might need to be rephrased more simply
- Tool parsing might sometimes require multiple attempts
- Response quality may vary depending on query complexity
- The 1k context window means longer conversations may lose earlier context
- Best results are achieved with clear, direct queries that match the example formats

For optimal results:
- Use simple, direct language
- Follow the example query formats
- Break complex operations into simpler steps
- Keep conversations focused and concise
- If a query fails, try rephrasing it more explicitly

3. Enter natural language queries to interact with the calculator and storage tools:

   - Calculator examples:
     - "What is 5 plus 3?"
     - "Calculate 10 times 4"
     - "Divide 15 by 3"

   - Storage examples:
     - "Store the value 'hello' with key 'greeting'"
     - "What is stored in 'greeting'?"
     - "Get the value of 'greeting'"

4. The LLM will process your query, execute the appropriate tool calls, and display the results.

5. Note: If you see "Model Not Ready" or any initialization errors, try refreshing the page. If the issue persists, check your internet connection and ensure your browser supports WebGPU.

### Tool Integration and Prompt Template

The application uses a carefully designed system prompt to ensure consistent and reliable tool execution. The LLM is instructed to use specific XML-like tags and JSON formats when calling tools:

```
<tool>tool_name</tool>
<params>{"param1": "value1", "param2": "value2"}</params>
```

Available tools and their formats:

1. Calculator Tool:
```
<tool>calculate</tool>
<params>{"operation": "add", "a": 5, "b": 3}</params>
```
Supports operations: "add", "subtract", "multiply", "divide"

2. Storage Tool:
```
<tool>storage-set</tool>
<params>{"key": "your-key", "value": "your-value"}</params>

<tool>storage-get</tool>
<params>{"key": "your-key"}</params>
```

When you submit a query, the LLM:
1. Analyzes your natural language input
2. Determines which tool(s) to use
3. Formats the tool calls according to these templates
4. Waits for each tool's response before proceeding
5. Formats the final response in clear, natural language

You can observe this process in real-time by viewing the console logs as described in the Debugging section.

### Example Flow:

Query: "What is 5 plus 3?"

1. LLM processes query and generates:
   ```
   <tool>calculate</tool>
   <params>{"operation": "add", "a": 5, "b": 3}</params>
   ```

2. MCP server executes calculation

3. LLM receives result (8) and responds naturally: "The answer is 8"

This structured approach ensures reliable communication between the LLM and the MCP server's tools while maintaining a natural conversation interface for users.

### Debugging and Monitoring

You can monitor the execution flow of tool calls and LLM processing by opening your browser's developer tools (press F12 or right-click and select "Inspect") and viewing the Console tab. The application logs detailed information about:

- 🎯 User input processing
- 🔍 Tool call detection
- 🛠️ Tool call parsing
- 📡 MCP server requests
- 📨 Tool responses
- ✅ Tool execution results
- ❌ Error messages (if any)

These logs can help you understand how the LLM processes your queries and interacts with the available tools. They're particularly useful when debugging why a particular query might not work as expected.

## WebLLM Integration

This project leverages the [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) library (version 0.2.6) to run LLMs directly in the browser using WebGPU. The library provides several key features:

1. Browser-based Inference:
   - Runs models entirely in the browser
   - Uses WebGPU for hardware acceleration
   - No server-side model hosting required

2. Efficient Model Loading:
   - Progressive downloading
   - Automatic caching
   - Memory-efficient execution

### Changing Models

The project currently uses the `Phi-3.5-mini-instruct-q4f16_1-MLC-1k` model, but you can experiment with other models supported by WebLLM. To change the model:

1. Open `src/web/llm.ts`
2. Locate the `initialize()` method
3. Modify the model name in the `CreateMLCEngine` call:

```typescript
this.engine = await CreateMLCEngine(
  "your-chosen-model", // Replace with desired model
  {
    initProgressCallback: (progress) => {
      this.modelStatusCallback(`Loading model: ${Math.round(progress.progress * 100)}%`);
    }
  }
);
```

Available Models:
- `Phi-3.5-mini-instruct-q4f16_1-MLC-1k` (default, 4-bit quantized, 1k context)
- `Llama-2-7b-chat-q4f16_1` (larger model, better quality)
- `RedPajama-3B-chat-q4f16_1` (balanced size/quality)
- `TinyLlama-1.1B-chat-q4f16_1` (smallest, fastest)

Model Considerations:
1. Larger models:
   - Better response quality
   - Larger download size
   - Higher memory usage
   - Slower inference

2. Smaller models:
   - Faster loading and inference
   - Lower memory usage
   - May produce lower quality responses
   - Better for resource-constrained environments

3. Context Window:
   - Models with larger context windows (e.g., `-2k` or `-4k` variants)
   - Can handle longer conversations
   - Require more memory

### Performance Tips

1. Model Loading:
   - First load will download the model (~100MB-4GB depending on model)
   - Subsequent loads use browser cache
   - Keep browser tab open to maintain model in memory

2. Memory Management:
   - Close other resource-intensive tabs
   - Monitor browser memory usage
   - Consider smaller models for low-memory devices

3. WebGPU Requirements:
   - Check GPU compatibility
   - Update graphics drivers
   - Enable WebGPU flags in browser

For more details about WebLLM and its capabilities, visit the [WebLLM Documentation](https://webllm.mlc.ai/).

## Project Structure

```
mcp-wasm-poc/
├── src/
│   └── web/
│       ├── server.ts      # MCP server implementation
│       ├── main.ts        # Client-side logic
│       └── browser-transport.ts # Browser transport layer
├── index.html            # Web interface
└── package.json         # Project dependencies
```

## Error Handling
- Server initialization errors
- Tool execution errors
- Resource access errors
- Input validation
- Transport layer errors

## Future Enhancements
- Additional calculator operations
- Persistent storage across sessions
- Enhanced UI/UX
- Additional MCP tools and resources
- WASM optimization

## Development
This is a proof-of-concept implementation demonstrating the feasibility of running an MCP server in a web browser using WebAssembly. The implementation focuses on demonstrating core MCP concepts while maintaining simplicity and clarity.

## Documentation

- [API Documentation](./API.md) - Detailed API reference
- [Components](./COMPONENTS.md) - Component architecture and design
- [Testing Guide](./TESTING.md) - Testing strategies and examples
- [Sequence Diagrams](./SEQUENCE_DIAGRAMS.md) - Message flow diagrams
