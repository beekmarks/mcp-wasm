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

## Implementation Notes

### Tool Registration
Tools are registered with the MCP server using the `tool` method:
```typescript
server.tool(
  name: string,
  schema: ZodObject,
  callback: (params: any) => Promise<Result>
)
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
