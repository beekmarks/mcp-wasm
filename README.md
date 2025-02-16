# WASM MCP Server

A proof-of-concept implementation of a Model Context Protocol (MCP) server that runs in WebAssembly (WASM) within a web browser. This project demonstrates the integration of MCP tools and resources in a browser environment.

## Features

### Calculator Tool
- Performs basic arithmetic operations (addition, subtraction, multiplication, division)
- Input validation and error handling
- Real-time calculation results

### Storage System
- Key-value storage functionality
- Set and retrieve values using string keys
- Persistent storage within the browser session
- Template-based resource handling

## Technical Implementation

### Server Components
- `server.ts`: Core MCP server implementation with tool and resource definitions
- `main.ts`: Client-side integration and UI interaction handling
- `browser-transport.ts`: Custom transport layer for browser communication

### Architecture
- Uses the Model Context Protocol SDK for server implementation
- Implements a custom browser transport layer
- Tools are registered with callback functions
- Resources use template paths with parameter substitution

### Key Concepts
1. **Tools**
   - Registered using `server.tool()`
   - Execute via callback functions
   - Schema validation using Zod

2. **Resources**
   - Template-based paths (e.g., `storage://{key}`)
   - Accessed via `readCallback`
   - Parameterized resource handling

## Usage

### Calculator
1. Select an operation (add, subtract, multiply, divide)
2. Enter two numbers
3. Click "Calculate" to see the result
4. Error handling for invalid inputs and division by zero

### Storage
1. Enter a key and value in the respective fields
2. Click "Set Storage" to store the value
3. Enter a key and click "Get Storage" to retrieve a value
4. Feedback provided for successful operations and errors

## Dependencies
- @modelcontextprotocol/sdk
- Zod (for schema validation)
- TypeScript
- Vite (for development and building)

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
