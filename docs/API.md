# WASM MCP Server API Documentation

This document provides detailed information about the tools and resources available in the WASM MCP Server implementation.

## Tools

### Calculator Tool

**Name:** `calculate`

**Description:**  
Performs basic arithmetic operations on two numbers.

**Schema:**
```typescript
{
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number()
}
```

**Parameters:**
- `operation`: The arithmetic operation to perform
  - `"add"`: Addition (a + b)
  - `"subtract"`: Subtraction (a - b)
  - `"multiply"`: Multiplication (a * b)
  - `"divide"`: Division (a / b)
- `a`: First number
- `b`: Second number

**Returns:**
```typescript
{
  content: [{
    type: "text",
    text: string  // The result as a string
  }]
}
```

**Errors:**
- Division by zero when operation is "divide" and b is 0
- Invalid operation type
- Non-numeric inputs

**Example:**
```typescript
// Addition
const result = await mcpServer.tools.callback('calculate', {
  operation: "add",
  a: 5,
  b: 3
});
// Result: { content: [{ type: "text", text: "8" }] }

// Division
const result = await mcpServer.tools.callback('calculate', {
  operation: "divide",
  a: 10,
  b: 2
});
// Result: { content: [{ type: "text", text: "5" }] }
```

### Storage Tool

**Name:** `set-storage`

**Description:**  
Stores a value associated with a key in the server's memory.

**Schema:**
```typescript
{
  key: z.string(),
  value: z.string()
}
```

**Parameters:**
- `key`: String identifier for the stored value
- `value`: String value to store

**Returns:**
```typescript
{
  content: [{
    type: "text",
    text: string  // Confirmation message
  }]
}
```

**Example:**
```typescript
const result = await mcpServer.tools.callback('set-storage', {
  key: "user-preference",
  value: "dark-mode"
});
// Result: { content: [{ type: "text", text: "Stored value at key: user-preference" }] }
```

## Resources

### Storage Resource

**URI Template:** `storage://{key}`

**Description:**  
Retrieves a value from storage using a key.

**Parameters:**
- `key`: The key to look up in storage (extracted from URI)

**Returns:**
```typescript
{
  contents: [{
    uri: string,    // The full URI used for the request
    text: string    // The stored value or "Key not found"
  }]
}
```

**Access Method:**
```typescript
// Create URI object
const uri = new URL(`storage://${key}`);

// Call resource handler
const result = await resourceHandler.readCallback(uri, { key });
```

**Example:**
```typescript
// Assuming we previously stored: { key: "theme", value: "dark" }
const uri = new URL('storage://theme');
const result = await resourceHandler.readCallback(uri, { key: "theme" });
// Result: { contents: [{ uri: "storage://theme", text: "dark" }] }

// For a non-existent key:
const uri = new URL('storage://nonexistent');
const result = await resourceHandler.readCallback(uri, { key: "nonexistent" });
// Result: { contents: [{ uri: "storage://nonexistent", text: "Key not found" }] }
```

## LLM Integration

### LLM Handler

**Class:** `LLMHandler`

**Description:**  
Handles natural language processing and conversion of user queries into tool calls.

**Constructor:**
```typescript
constructor(
  transport: BrowserTransport,
  server: McpServer,
  modelStatusCallback: (status: string) => void
)
```

**Methods:**

#### initialize()
```typescript
async initialize(): Promise<boolean>
```
Initializes the LLM engine and sets up system prompts.

**Returns:** Promise resolving to true if initialization is successful

**Throws:** Error if initialization fails

#### processUserInput()
```typescript
async processUserInput(
  userInput: string,
  streamCallback?: (text: string) => void
): Promise<string>
```

Processes a natural language query and executes appropriate tool calls.

**Parameters:**
- `userInput`: The user's natural language query
- `streamCallback`: Optional callback for streaming responses

**Returns:** Promise resolving to the final response string

**Example:**
```typescript
const llmHandler = new LLMHandler(transport, server, statusCallback);
await llmHandler.initialize();

// Calculator query
const result = await llmHandler.processUserInput("What is 5 plus 3?");
// Result: "The answer is 8"

// Storage query
await llmHandler.processUserInput('Store "hello" with key "greeting"');
const value = await llmHandler.processUserInput('What is stored in "greeting"?');
// Value: "The value is hello"
```

### Tool Call Format

The LLM generates tool calls in the following format:

```typescript
interface ToolCall {
  name: string;      // Tool name (e.g., "calculate", "storage-set")
  params: {          // Tool parameters
    [key: string]: any;
  }
}
```

**Calculator Examples:**
```
<tool>calculate</tool>
<params>{"operation": "add", "a": 5, "b": 3}</params>
```

**Storage Examples:**
```
<tool>storage-set</tool>
<params>{"key": "greeting", "value": "hello"}</params>

<tool>storage-get</tool>
<params>{"key": "greeting"}</params>
```

### Error Handling

The LLM handler includes comprehensive error handling:

1. **Initialization Errors:**
   - Model loading failures
   - WebGPU not supported
   - Memory allocation issues

2. **Processing Errors:**
   - Invalid tool call format
   - Unknown tool names
   - Parameter validation failures
   - Tool execution errors

3. **Response Formatting:**
   - Malformed tool responses
   - Stream interruptions
   - Context overflow

### Implementation Notes

1. **System Prompts:**
   - Defines available tools and their formats
   - Specifies response formatting rules
   - Sets conversation boundaries

2. **Message History:**
   - Maintains conversation context
   - Includes system prompts
   - Manages context window

3. **Performance Considerations:**
   - Local processing using WebGPU
   - Streaming responses for better UX
   - Efficient memory management

4. **Security:**
   - Input validation
   - Tool call verification
   - Response sanitization

For detailed implementation of the LLM handler, refer to `llm.ts`.

## Implementation Notes

### Tool Registration
Tools are registered with the MCP server using the `tool` method:
```typescript
server.tool(
  name: string,
  description: string,
  schema: ZodObject,
  callback: (extra: RequestHandlerExtra) => Promise<{
    content: Array<{
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    }>;
  }>
)
```

The `RequestHandlerExtra` type contains validated parameters in its `params` property:
```typescript
interface RequestHandlerExtra {
  params: Record<string, any>;  // Validated against the provided schema
}
```

Example registration:
```typescript
const myToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional()
}).strict();

server.tool(
  'my-tool',
  'Description of what my tool does',
  myToolSchema.shape,
  async (extra: RequestHandlerExtra) => {
    const { param1, param2 } = extra.params;
    // Tool implementation
    return {
      content: [{
        type: 'text',
        text: 'Result'
      }]
    };
  }
);
```

### Resource Registration
Resources are registered using the `resource` method:
```typescript
server.resource(
  name: string,
  template: string,
  callback: (uri: URL, params: any) => Promise<Result>
)
```

### Error Handling
All tools and resources should implement proper error handling:
- Input validation using Zod schemas
- Meaningful error messages
- Proper type checking
- Edge case handling (e.g., division by zero)

### Security Considerations
- Input sanitization is handled by Zod schemas
- No persistent storage between sessions
- No sensitive data should be stored
- All operations are synchronous and local to the browser

## Browser Transport Layer

The browser transport layer handles communication between the client and the WASM MCP server:

- Initialization occurs when the page loads
- Message passing uses the browser's event system
- Error handling for transport failures
- State management for server connection

For detailed implementation of the transport layer, refer to `browser-transport.ts`.
