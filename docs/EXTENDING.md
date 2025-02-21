# Extending the WASM MCP Tool System

This guide explains how to add new tools to the WebLLM-based Model Context Protocol system. The system allows the LLM to intelligently choose and use tools based on user queries.

## Table of Contents
- [Overview](#overview)
- [Adding a New Tool](#adding-a-new-tool)
- [Tool Response Format](#tool-response-format)
- [Example: Translation Tool](#example-translation-tool)
- [Example: External Service Integration](#example-external-service-integration)
- [Environment Setup](#environment-setup)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The system consists of three main components:
1. **Tool Registration**: Define and register tools in `server.ts`
2. **LLM Integration**: Update the system prompt in `llm.ts`
3. **Tool Implementation**: Implement the tool's business logic

## Adding a New Tool

Follow these steps to add a new tool:

### 1. Define the Tool Schema

In `server.ts`, create a Zod schema that defines your tool's parameters:

```typescript
const myToolSchema = z.object({
    param1: z.string(),
    param2: z.number(),
    // Add more parameters as needed
});
```

### 2. Register the Tool

Still in `server.ts`, register your tool with the server:

```typescript
server.tool(
    "my-tool-name",
    myToolSchema.shape,
    async (params) => {
        // Validate parameters
        const result = myToolSchema.safeParse(params);
        if (!result.success) {
            throw new Error('Invalid input parameters');
        }

        // Implement tool logic
        const { param1, param2 } = result.data;
        const response = await doSomething(param1, param2);

        // Return response in required format
        return {
            contents: [{
                type: "text",
                text: JSON.stringify(response)
            }]
        };
    }
);
```

### 3. Update the System Prompt

In `llm.ts`, add your tool to the `systemPrompt` string:

```typescript
private systemPrompt = `You are a helpful AI assistant with access to tools. You MUST use tools when appropriate. Follow these rules EXACTLY:

// ... existing tools ...

4. For [describe when to use your tool], use:
   <tool>my-tool-name</tool>
   <params>{
     "param1": "string value",
     "param2": number_value
   }</params>
`;
```

## Tool Response Format

All tools must return responses in this format:

```typescript
{
    contents: [{
        type: "text",
        text: string  // Usually JSON.stringify(yourResponse)
    }]
}
```

## Example: Translation Tool

Here's a complete example of adding a translation tool:

```typescript
// In server.ts

// 1. Define schema
const translationSchema = z.object({
    text: z.string(),
    targetLanguage: z.string()
});

// 2. Register tool
server.tool(
    "translate",
    translationSchema.shape,
    async (params) => {
        const result = translationSchema.safeParse(params);
        if (!result.success) {
            throw new Error('Invalid input parameters');
        }

        const { text, targetLanguage } = result.data;
        const translation = await translateText(text, targetLanguage);

        return {
            contents: [{
                type: "text",
                text: JSON.stringify({ translation })
            }]
        };
    }
);

// In llm.ts systemPrompt
4. For translation requests, use:
   <tool>translate</tool>
   <params>{
     "text": "text to translate",
     "targetLanguage": "target language code (e.g., 'es' for Spanish)"
   }</params>
```

## Example: External Service Integration

Here's an example of integrating an external service like Tavily Search:

```typescript
// In services/my-service.ts
export class MyServiceClient {
    private apiKey: string;
    
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    
    async makeRequest(params: any) {
        // Implement API call
    }
}

// In server.ts
const myServiceSchema = z.object({
    query: z.string(),
    options: z.object({
        param1: z.string()
    }).optional()
});

// Initialize client
const myServiceClient = new MyServiceClient(process.env.MY_SERVICE_API_KEY);

// Register tool
server.tool(
    "my-service",
    myServiceSchema.shape,
    async (params) => {
        const result = myServiceSchema.safeParse(params);
        if (!result.success) {
            throw new Error('Invalid input parameters');
        }

        const response = await myServiceClient.makeRequest(params);
        return {
            contents: [{
                type: "text",
                text: JSON.stringify(response)
            }]
        };
    }
);

// In llm.ts systemPrompt
For queries requiring [your service], use:
   <tool>my-service</tool>
   <params>{
     "query": "user's request",
     "options": {
       "param1": "optional parameter"
     }
   }</params>
```

## Environment Setup

When integrating external services, follow these steps:

1. Create a `.env` file in the root directory:
```bash
VITE_MY_SERVICE_API_KEY=your-api-key-here
```

2. Add the environment variable to your `vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
    VITE_MY_SERVICE_API_KEY: string;
}
```

3. Access the API key in your code:
```typescript
const apiKey = import.meta.env.VITE_MY_SERVICE_API_KEY;
if (!apiKey) {
    throw new Error('MY_SERVICE_API_KEY not found in environment');
}
```

4. Update `.gitignore` to exclude your `.env` file:
```
.env
.env.local
```

## Security Considerations

When integrating external services:
1. Never commit API keys to version control
2. Validate and sanitize all inputs
3. Handle rate limits and API errors gracefully
4. Consider implementing request caching
5. Add proper error handling for API failures

## Best Practices

1. **Parameter Validation**
   - Always use Zod schemas to validate parameters
   - Add descriptive error messages
   - Consider adding parameter constraints (e.g., string length, number range)

2. **Error Handling**
   - Validate inputs before processing
   - Handle external service failures gracefully
   - Return clear error messages

3. **Response Format**
   - Always use the standard `contents` array format
   - Use JSON for structured data
   - Keep responses concise and well-formatted

4. **System Prompt**
   - Be explicit about when the tool should be used
   - Provide clear parameter examples
   - Document any special requirements or limitations

5. **Tool Names**
   - Use descriptive, unique names
   - Follow kebab-case naming convention
   - Avoid generic terms that might conflict

## Troubleshooting

Common issues and solutions:

1. **Tool Not Being Called**
   - Check the system prompt formatting
   - Verify the tool name matches exactly
   - Review the LLM's response for parsing errors

2. **Parameter Validation Errors**
   - Confirm parameter types match the schema
   - Check for missing required parameters
   - Verify parameter value constraints

3. **Response Format Issues**
   - Ensure response follows the `contents` array format
   - Check JSON stringification of complex objects
   - Verify response text is properly escaped

4. **LLM Integration Problems**
   - Review system prompt XML formatting
   - Check tool call pattern matches expected format
   - Verify parameter examples are valid JSON

For additional help, check the console logs which provide detailed information about:
- Tool selection process
- Parameter validation
- Response handling
- Error messages
