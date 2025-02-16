# WASM MCP Server Testing Strategy

This document outlines the testing approach for the WASM MCP Server implementation, covering unit tests, integration tests, and end-to-end testing.

## 1. Unit Testing

### Server Component (`server.ts`)

#### Tool Registration Tests
```typescript
describe('MCP Server Tool Registration', () => {
  let server: McpServer;
  
  beforeEach(() => {
    server = createServer();
  });
  
  test('should register calculator tool', () => {
    const tools = server._registeredTools;
    expect(tools).toHaveProperty('calculate');
    expect(tools.calculate).toHaveProperty('callback');
  });
  
  test('should register storage tool', () => {
    const tools = server._registeredTools;
    expect(tools).toHaveProperty('set-storage');
    expect(tools['set-storage']).toHaveProperty('callback');
  });
});
```

#### Calculator Tool Tests
```typescript
describe('Calculator Tool', () => {
  let server: McpServer;
  let calculatorTool: any;
  
  beforeEach(() => {
    server = createServer();
    calculatorTool = server._registeredTools.calculate;
  });
  
  test('should add numbers correctly', async () => {
    const result = await calculatorTool.callback({
      operation: 'add',
      a: 5,
      b: 3
    });
    expect(result.content[0].text).toBe('8');
  });
  
  test('should handle division by zero', async () => {
    await expect(calculatorTool.callback({
      operation: 'divide',
      a: 10,
      b: 0
    })).rejects.toThrow('Division by zero');
  });
  
  test('should validate input types', async () => {
    await expect(calculatorTool.callback({
      operation: 'add',
      a: 'not a number',
      b: 3
    })).rejects.toThrow();
  });
});
```

#### Storage Tests
```typescript
describe('Storage Operations', () => {
  let server: McpServer;
  let storageTool: any;
  let storageResource: any;
  
  beforeEach(() => {
    server = createServer();
    storageTool = server._registeredTools['set-storage'];
    storageResource = server._registeredResources['storage://{key}'];
  });
  
  test('should store and retrieve values', async () => {
    // Store value
    await storageTool.callback({
      key: 'test-key',
      value: 'test-value'
    });
    
    // Retrieve value
    const uri = new URL('storage://test-key');
    const result = await storageResource.readCallback(uri, { key: 'test-key' });
    expect(result.contents[0].text).toBe('test-value');
  });
  
  test('should handle missing keys', async () => {
    const uri = new URL('storage://nonexistent');
    const result = await storageResource.readCallback(uri, { key: 'nonexistent' });
    expect(result.contents[0].text).toBe('Key not found');
  });
});
```

### Transport Component (`browser-transport.ts`)

```typescript
describe('Browser Transport', () => {
  let transport: BrowserTransport;
  
  beforeEach(() => {
    transport = new BrowserTransport();
  });
  
  test('should initialize correctly', async () => {
    await transport.start();
    expect(transport.isConnected()).toBe(true);
  });
  
  test('should handle message sending', async () => {
    const message = { type: 'test', data: 'value' };
    const response = await transport.send(message);
    expect(response).toBeDefined();
  });
  
  test('should handle connection errors', async () => {
    // Simulate connection failure
    jest.spyOn(transport, 'start').mockRejectedValue(new Error('Connection failed'));
    await expect(transport.start()).rejects.toThrow('Connection failed');
  });
});
```

## 2. Integration Testing

### Server-Transport Integration

```typescript
describe('Server-Transport Integration', () => {
  let server: McpServer;
  let transport: BrowserTransport;
  
  beforeEach(async () => {
    transport = new BrowserTransport();
    await transport.start();
    server = createServer();
    await server.connect(transport);
  });
  
  test('should handle tool execution through transport', async () => {
    const message = {
      type: 'tool',
      name: 'calculate',
      params: {
        operation: 'add',
        a: 5,
        b: 3
      }
    };
    
    const response = await transport.send(message);
    expect(response.content[0].text).toBe('8');
  });
  
  test('should handle resource access through transport', async () => {
    // First store a value
    await transport.send({
      type: 'tool',
      name: 'set-storage',
      params: {
        key: 'test-key',
        value: 'test-value'
      }
    });
    
    // Then retrieve it
    const response = await transport.send({
      type: 'resource',
      uri: 'storage://test-key'
    });
    
    expect(response.contents[0].text).toBe('test-value');
  });
});
```

### UI Integration Tests

```typescript
describe('UI Integration', () => {
  beforeEach(async () => {
    // First set up test environment
    await setupTestEnvironment();
    
    // Then initialize UI
    setupCalculatorUI();
  });
  
  test('should handle calculator UI interaction', async () => {
    const num1Input = document.getElementById('num1') as HTMLInputElement;
    const num2Input = document.getElementById('num2') as HTMLInputElement;
    const operationSelect = document.getElementById('operation') as HTMLSelectElement;
    const calcButton = document.getElementById('calcButton') as HTMLButtonElement;
    const output = document.getElementById('calcOutput');
    
    // Test each operation
    const operations = [
      { op: 'add', a: 5, b: 3, expected: '8' },
      { op: 'subtract', a: 10, b: 4, expected: '6' },
      { op: 'multiply', a: 6, b: 7, expected: '42' },
      { op: 'divide', a: 15, b: 3, expected: '5' }
    ];
    
    for (const { op, a, b, expected } of operations) {
      operationSelect.value = op;
      num1Input.value = a.toString();
      num2Input.value = b.toString();
      
      fireEvent.click(calcButton);
      
      // Wait for the calculation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(output?.textContent).toBe(`Result: ${expected}`);
    }
  });
  
  test('should handle calculator error cases', async () => {
    const num1Input = document.getElementById('num1') as HTMLInputElement;
    const num2Input = document.getElementById('num2') as HTMLInputElement;
    const operationSelect = document.getElementById('operation') as HTMLSelectElement;
    const calcButton = document.getElementById('calcButton') as HTMLButtonElement;
    const output = document.getElementById('calcOutput');
    
    // Test division by zero
    operationSelect.value = 'divide';
    num1Input.value = '10';
    num2Input.value = '0';
    
    fireEvent.click(calcButton);
    
    // Wait for the error to be displayed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(output?.textContent).toContain('Error');
    expect(output?.textContent).toContain('Division by zero');
  });
});

describe('Storage UI Integration', () => {
  beforeEach(async () => {
    // First set up test environment
    await setupTestEnvironment();
    
    // Then initialize UI
    setupStorageUI();
  });
  
  test('should handle storage UI interaction', async () => {
    const keyInput = document.getElementById('storageKey') as HTMLInputElement;
    const valueInput = document.getElementById('storageValue') as HTMLInputElement;
    const setButton = document.getElementById('setStorageButton') as HTMLButtonElement;
    const getButton = document.getElementById('getStorageButton') as HTMLButtonElement;
    const output = document.getElementById('storageOutput');
    
    // Set value
    keyInput.value = 'test-key';
    valueInput.value = 'test-value';
    fireEvent.click(setButton);
    
    // Wait for the storage operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(output?.textContent).toContain('Value stored successfully');
    
    // Get value
    valueInput.value = '';
    fireEvent.click(getButton);
    
    // Wait for the retrieval to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(output?.textContent).toContain('test-value');
  });
  
  test('should handle missing storage keys', async () => {
    const keyInput = document.getElementById('storageKey') as HTMLInputElement;
    const getButton = document.getElementById('getStorageButton') as HTMLButtonElement;
    const output = document.getElementById('storageOutput');
    
    keyInput.value = 'nonexistent-key';
    fireEvent.click(getButton);
    
    // Wait for the retrieval to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(output?.textContent).toContain('Key not found');
  });
});
```

## 3. End-to-End Testing

### Test Scenarios

```typescript
describe('End-to-End Workflows', () => {
  beforeEach(async () => {
    // Set up complete environment
    await setupTestEnvironment();
  });
  
  test('complete calculator workflow', async () => {
    // Test all operations
    const operations = ['add', 'subtract', 'multiply', 'divide'];
    const testCases = [
      { a: 5, b: 3, expected: ['8', '2', '15', '1.6666666666666667'] }
    ];
    
    for (const { a, b, expected } of testCases) {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const result = await executeCalculation(operation, a, b);
        expect(result).toBe(expected[i]);
      }
    }
  });
  
  test('complete storage workflow', async () => {
    // Store multiple values
    const testData = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' }
    ];
    
    for (const { key, value } of testData) {
      await setStorageValue(key, value);
      const retrieved = await getStorageValue(key);
      expect(retrieved).toBe(value);
    }
  });
});
```

## 4. Performance Testing

```typescript
describe('Performance Tests', () => {
  test('calculator performance', async () => {
    const startTime = performance.now();
    
    // Perform 1000 calculations
    for (let i = 0; i < 1000; i++) {
      await executeCalculation('add', i, i + 1);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });
  
  test('storage performance', async () => {
    const startTime = performance.now();
    
    // Perform 1000 storage operations
    for (let i = 0; i < 1000; i++) {
      await setStorageValue(`key${i}`, `value${i}`);
      await getStorageValue(`key${i}`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
  });
});
```

## 5. Error Testing

```typescript
describe('Error Handling', () => {
  test('server initialization errors', async () => {
    // Test invalid server configuration
    expect(() => {
      new McpServer({ name: '', version: '' });
    }).toThrow();
  });
  
  test('transport errors', async () => {
    // Test connection failures
    const transport = new BrowserTransport();
    jest.spyOn(transport, 'start').mockRejectedValue(new Error('Network error'));
    
    await expect(transport.start()).rejects.toThrow('Network error');
  });
  
  test('calculator errors', async () => {
    // Test various error conditions
    const errorCases = [
      { operation: 'divide', a: 1, b: 0, error: 'Division by zero' },
      { operation: 'invalid', a: 1, b: 1, error: 'Invalid operation' },
      { operation: 'add', a: 'invalid', b: 1, error: 'Invalid input' }
    ];
    
    for (const { operation, a, b, error } of errorCases) {
      await expect(executeCalculation(operation, a, b)).rejects.toThrow(error);
    }
  });
});
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Setup
```typescript
// jest.setup.ts
import '@testing-library/jest-dom';

global.beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset storage
  localStorage.clear();
  
  // Reset server state
  jest.resetModules();
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- server.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Test Coverage Requirements

- Minimum 80% line coverage
- Minimum 80% branch coverage
- Minimum 80% function coverage
- Critical paths must have 100% coverage:
  - Server initialization
  - Tool registration
  - Resource handling
  - Error handling

## Manual Testing Checklist

1. Server Initialization
   - [ ] Server starts successfully
   - [ ] Tools are registered
   - [ ] Resources are available
   - [ ] UI is enabled

2. Calculator Operations
   - [ ] All operations work correctly
   - [ ] Error handling works
   - [ ] UI updates properly
   - [ ] Performance is acceptable

3. Storage Operations
   - [ ] Can store values
   - [ ] Can retrieve values
   - [ ] Handles missing keys
   - [ ] Updates UI correctly

4. Error Scenarios
   - [ ] Server initialization failures
   - [ ] Network errors
   - [ ] Invalid inputs
   - [ ] Resource not found

5. Browser Compatibility
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge
