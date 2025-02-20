# WASM MCP Server Sequence Diagrams

This document illustrates the message flows between different components of the WASM MCP Server using sequence diagrams.

## Server Initialization Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Main
    participant Transport
    participant MCPServer
    
    Browser->>Main: Page Load
    activate Main
    Main->>Transport: new BrowserTransport()
    activate Transport
    Main->>Transport: start()
    Transport-->>Main: Transport Ready
    
    Main->>MCPServer: createServer()
    activate MCPServer
    MCPServer->>MCPServer: Register Calculator Tool
    MCPServer->>MCPServer: Register Storage Resource
    MCPServer->>MCPServer: Register Storage Tool
    MCPServer-->>Main: Server Instance
    
    Main->>MCPServer: connect(transport)
    MCPServer->>Transport: Establish Connection
    Transport-->>MCPServer: Connection Established
    MCPServer-->>Main: Connection Ready
    
    Main->>Browser: Enable UI Elements
    deactivate Main
    deactivate Transport
    deactivate MCPServer
```

## Calculator Operation Flow

```mermaid
sequenceDiagram
    participant UI
    participant Main
    participant MCPServer
    participant CalculatorTool
    
    UI->>Main: Click Calculate Button
    activate Main
    
    Main->>Main: Validate Server State
    Main->>Main: Get Input Values
    
    Main->>MCPServer: Get Tool Handler
    activate MCPServer
    MCPServer-->>Main: Calculator Tool Handler
    
    Main->>CalculatorTool: callback({operation, a, b})
    activate CalculatorTool
    CalculatorTool->>CalculatorTool: Validate Input
    CalculatorTool->>CalculatorTool: Perform Calculation
    CalculatorTool-->>Main: Result
    deactivate CalculatorTool
    
    Main->>UI: Update Output Display
    deactivate Main
    deactivate MCPServer
    
    Note over UI,CalculatorTool: Error handling at each step
```

## Storage Set Operation Flow

```mermaid
sequenceDiagram
    participant UI
    participant Main
    participant MCPServer
    participant StorageTool
    participant StorageMap
    
    UI->>Main: Click Set Storage Button
    activate Main
    
    Main->>Main: Validate Server State
    Main->>Main: Get Key/Value
    
    Main->>MCPServer: Get Tool Handler
    activate MCPServer
    MCPServer-->>Main: Storage Tool Handler
    
    Main->>StorageTool: callback({key, value})
    activate StorageTool
    StorageTool->>StorageTool: Validate Input
    StorageTool->>StorageMap: set(key, value)
    StorageMap-->>StorageTool: Success
    StorageTool-->>Main: Confirmation
    deactivate StorageTool
    
    Main->>UI: Update Output Display
    deactivate Main
    deactivate MCPServer
```

## Storage Get Operation Flow

```mermaid
sequenceDiagram
    participant UI
    participant Main
    participant MCPServer
    participant StorageResource
    participant StorageMap
    
    UI->>Main: Click Get Storage Button
    activate Main
    
    Main->>Main: Validate Server State
    Main->>Main: Get Key
    
    Main->>MCPServer: Get Resource Handler
    activate MCPServer
    MCPServer-->>Main: Storage Resource Handler
    
    Main->>Main: Create URI
    Main->>StorageResource: readCallback(uri, {key})
    activate StorageResource
    StorageResource->>StorageResource: Validate Key
    StorageResource->>StorageMap: get(key)
    StorageMap-->>StorageResource: Value
    StorageResource-->>Main: Result
    deactivate StorageResource
    
    Main->>UI: Update Output Display
    deactivate Main
    deactivate MCPServer
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant UI
    participant Main
    participant MCPServer
    participant Tool
    
    UI->>Main: Action Request
    activate Main
    
    Main->>Main: Check Server State
    alt Server Not Initialized
        Main->>UI: Show Error: "Server not initialized"
    else Server Ready
        Main->>MCPServer: Get Handler
        alt Handler Not Found
            Main->>UI: Show Error: "Handler not found"
        else Handler Found
            Main->>Tool: Execute Operation
            alt Operation Success
                Tool-->>Main: Result
                Main->>UI: Show Result
            else Operation Error
                Tool-->>Main: Error
                Main->>UI: Show Error Message
            end
        end
    end
    deactivate Main
```

## Transport Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Transport
    participant WASM
    participant Server
    
    Client->>Transport: Send Request
    activate Transport
    
    Transport->>Transport: Serialize Message
    Transport->>WASM: Post Message
    activate WASM
    
    WASM->>Server: Process Request
    activate Server
    Server-->>WASM: Response
    deactivate Server
    
    WASM-->>Transport: Post Response
    deactivate WASM
    
    Transport->>Transport: Deserialize Message
    Transport-->>Client: Return Result
    deactivate Transport
```

## Notes on the Diagrams

### Component Roles
- **Browser/UI**: Handles user interactions and display
- **Main**: Coordinates between UI and server components
- **Transport**: Manages message passing
- **MCPServer**: Core server functionality
- **Tools/Resources**: Specific implementations

### Key Interactions
1. **Initialization**: One-time setup of server and transport
2. **Tool Operations**: Synchronous request-response
3. **Resource Access**: Template-based with parameters
4. **Error Handling**: At multiple levels

### Important Considerations
- All operations are asynchronous
- Error handling at each step
- State validation before operations
- Clear message flow paths
- Resource cleanup
