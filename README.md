# WASM MCP Server

A proof-of-concept implementation of a Model Context Protocol (MCP) server that runs in WebAssembly (WASM) within a web browser. This project demonstrates the integration of MCP tools and resources in a browser environment.

## Features

### WebLLM Integration
- Local LLM running in the browser using WebLLM
- Intelligent tool selection based on user queries
- XML-based tool calling format
- Proper error handling and response formatting

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

### Tavily Search Integration
- Real-time search functionality for current information
- Advanced search depth for comprehensive results
- Automatic query formatting and response parsing
- Integration with LLM for natural language understanding

## Technical Implementation

### Server Components
- `server.ts`: Core MCP server implementation with tool and resource definitions
- `main.ts`: Client-side integration and UI interaction handling
- `browser-transport.ts`: Custom transport layer for browser communication
- `llm.ts`: WebLLM integration for natural language processing
- `services/tavily.ts`: Tavily search service integration

### Architecture
- Uses the Model Context Protocol SDK for server implementation
- Implements a custom browser transport layer
- WebLLM for local LLM processing
- Tools are registered with callback functions
- Resources use template paths with parameter substitution

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
   - Local processing using WebLLM
   - Intelligent tool selection based on user queries
   - XML-based tool calling format
   - Response formatting and error handling
   - System prompts for consistent behavior

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A modern web browser with WebGPU support (Chrome Canary or Edge Canary with WebGPU flag enabled)
- Tavily API key (for search functionality)

### Environment Setup

Create a `.env` file in the root directory with:
```bash
VITE_TAVILY_API_KEY=your-tavily-api-key
```

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

## Usage Examples

### Calculator
```
User: What is 2 plus 4?
Assistant: Let me calculate that for you.
Result: 6
```

### Storage
```
User: Store my name as John
Assistant: Value stored successfully.

User: What is my name?
Assistant: Your stored name is: John
```

### Search
```
User: What's the weather in Boston?
Assistant: According to current information: [weather details from Tavily]
```

## Extending the System

See [docs/EXTENDING.md](docs/EXTENDING.md) for detailed instructions on how to add new tools to the system.

## Project Structure

```
mcp-wasm-poc/
├── src/
│   ├── wasm/           # WASM-specific code
│   └── web/            # Web interface code
│       ├── services/   # External service integrations
│       ├── llm.ts      # WebLLM integration
│       ├── main.ts     # Client-side logic
│       └── browser-transport.ts # Browser transport layer
├── docs/              # Documentation
├── index.html        # Web interface
└── package.json     # Project dependencies
```

## Troubleshooting

1. **Model Not Ready**: If you see this error, try refreshing the page. The WebLLM model needs to be downloaded and initialized.
2. **Search Not Working**: Verify your Tavily API key is correctly set in the `.env` file.
3. **Browser Compatibility**: Ensure you're using a browser with WebGPU support enabled.
4. **Tool Errors**: Check the console for detailed error messages about tool execution.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
