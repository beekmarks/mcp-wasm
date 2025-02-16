# WASM MCP Server Components Documentation

This document provides detailed information about each major component in the WASM MCP Server implementation.

## Core Components

### 1. MCP Server (`server.ts`)

**Purpose:**  
The core server implementation that handles tool registration, resource management, and request processing.

**Key Responsibilities:**
- Server initialization and configuration
- Tool and resource registration
- Schema validation
- Request handling
- Response formatting

**Implementation Details:**
```typescript
export function createServer(): McpServer {
  const server = new McpServer({
    name: "WASM MCP Server",
    version: "1.0.0"
  });
  // ... tool and resource registration
}
```

**Key Features:**
- Singleton server instance
- Tool registration with schema validation
- Resource template handling
- In-memory storage management
- Error handling and validation

**Initialization Flow:**
1. Create server instance
2. Register calculator tool
3. Register storage resource
4. Register storage tool
5. Initialize internal storage
6. Return configured server

### 2. Client Integration (`main.ts`)

**Purpose:**  
Handles client-side integration, UI interactions, and server communication.

**Key Responsibilities:**
- Server initialization in browser
- UI event handling
- Tool execution
- Resource access
- Error display
- State management

**Component Structure:**
```
- Environment Setup
  ├── Transport initialization
  ├── Server creation
  └── Connection establishment

- Calculator Integration
  ├── UI initialization
  ├── Event handlers
  ├── Input validation
  └── Result display

- Storage Integration
  ├── UI initialization
  ├── Set/Get handlers
  ├── Key/Value management
  └── Status display
```

**Implementation Flow:**
```typescript
// 1. Environment Setup
async function setupEnvironment() {
  const transport = new BrowserTransport();
  await transport.start();
  const server = createServer();
  await server.connect(transport);
  return { server, transport };
}

// 2. Calculator Integration
async function initializeCalculator(transport: BrowserTransport) {
  // Set up event handlers for calculator UI
  // Handle calculations through transport
  // Display results/errors
}

// 3. Storage Integration
async function initializeStorage(transport: BrowserTransport) {
  // Set up event handlers for storage UI
  // Handle set/get operations
  // Display results/errors
}

// 4. Main Initialization
async function main() {
  const { transport } = await setupEnvironment();
  await initializeCalculator(transport);
  await initializeStorage(transport);
}
```

**Error Handling:**
- Transport connection errors
- Tool execution errors
- Resource access errors
- Input validation
- UI element initialization
- Message handling errors

**State Management:**
- Single transport instance shared across components
- Isolated UI component initialization
- Independent error handling per component
- Asynchronous operation handling

### 3. Browser Transport (`browser-transport.ts`)

**Purpose:**  
Provides communication layer between the client and WASM server.

**Key Responsibilities:**
- Message passing
- Event handling
- Connection management
- Error handling

**Implementation Details:**
```typescript
export class BrowserTransport {
  private connected: boolean = false;
  
  async start() {
    // Initialize transport
  }
  
  async send(message: any) {
    // Send message to server
  }
  
  onMessage(callback: (message: any) => void) {
    // Handle incoming messages
  }
}
```

**Message Flow:**
1. Client initiates request
2. Transport serializes message
3. WASM server processes request
4. Response returned via transport
5. Client receives and processes response

### 4. UI Components

**Calculator Interface:**
```html
<div class="calculator">
  <select id="operation">
    <option value="add">Add</option>
    <option value="subtract">Subtract</option>
    <option value="multiply">Multiply</option>
    <option value="divide">Divide</option>
  </select>
  <input type="number" id="num1">
  <input type="number" id="num2">
  <button onclick="calculate()">Calculate</button>
  <div id="calcOutput" class="output"></div>
</div>
```

**Storage Interface:**
```html
<div class="storage">
  <input type="text" id="storageKey" placeholder="Key">
  <input type="text" id="storageValue" placeholder="Value">
  <button onclick="setStorage()">Set Storage</button>
  <button onclick="getStorage()">Get Storage</button>
  <div id="storageOutput" class="output"></div>
</div>
```

## Integration Points

### 1. Server-Transport Integration

**Connection Setup:**
```typescript
const transport = new BrowserTransport();
await transport.start();
mcpServer = createServer();
await mcpServer.connect(transport);
```

**Message Handling:**
```typescript
transport.onMessage(async (message) => {
  // Process incoming messages
  const response = await processMessage(message);
  transport.send(response);
});
```

### 2. Tool-Server Integration

**Tool Registration:**
```typescript
server.tool(
  "calculate",
  schema,
  async (params) => {
    // Tool implementation
    return response;
  }
);
```

**Tool Execution:**
```typescript
const result = await toolHandler.callback({
  operation: "add",
  a: 5,
  b: 3
});
```

### 3. Resource-Server Integration

**Resource Registration:**
```typescript
server.resource(
  "storage",
  "storage://{key}",
  async (uri, params) => {
    // Resource implementation
    return response;
  }
);
```

**Resource Access:**
```typescript
const uri = new URL(`storage://${key}`);
const result = await resourceHandler.readCallback(uri, { key });
```

## Development Considerations

### 1. Type Safety

- Use TypeScript for type checking
- Define interfaces for messages
- Validate schemas using Zod
- Handle type conversions

### 2. Error Handling

- Graceful degradation
- User-friendly error messages
- Console logging for debugging
- Error recovery strategies

### 3. Performance

- Minimize message size
- Batch operations when possible
- Efficient state management
- Resource cleanup

### 4. Security

- Input validation
- Sanitization
- Scope limitation
- Error message safety

## Testing Considerations

### 1. Unit Tests

- Tool functionality
- Resource access
- Schema validation
- Error handling

### 2. Integration Tests

- Server-transport communication
- Tool-resource interaction
- UI-server integration
- Error propagation

### 3. End-to-End Tests

- Complete workflows
- Edge cases
- Error scenarios
- Performance metrics

## Future Enhancements

### 1. Component Improvements

- Enhanced error handling
- Better type safety
- Performance optimizations
- Additional tools and resources

### 2. Architecture Improvements

- Modular design
- Plugin system
- Caching layer
- State management

### 3. UI Improvements

- Better error display
- Loading states
- Input validation
- Responsive design
