import { setupTestEnvironment, setupCalculatorUI, setupStorageUI } from './test-utils';
import { fireEvent } from '@testing-library/dom';

describe('Integration Tests', () => {
  describe('Server-Transport Integration', () => {
    test('should handle tool execution through transport', async () => {
      const { transport, server } = await setupTestEnvironment();
      
      const message = {
        jsonrpc: "2.0" as const,
        method: "tool",
        id: 1,
        params: {
          name: "calculate",
          params: {
            operation: "add",
            a: 5,
            b: 3
          }
        }
      };
      
      const mockCallback = jest.fn();
      transport.onMessage(mockCallback);
      await transport.send(message);
      
      // Wait for the response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback).toHaveBeenCalled();
      const response = mockCallback.mock.calls[0][0];
      expect(response.result.content[0].text).toBe('8');
    });
    
    test('should handle resource access through transport', async () => {
      const { transport, server } = await setupTestEnvironment();
      
      // First store a value
      await transport.send({
        jsonrpc: "2.0" as const,
        method: "tool",
        id: 1,
        params: {
          name: "set-storage",
          params: {
            key: "test-key",
            value: "test-value"
          }
        }
      });
      
      // Wait for the storage operation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then retrieve it
      const mockCallback = jest.fn();
      transport.onMessage(mockCallback);
      
      await transport.send({
        jsonrpc: "2.0" as const,
        method: "resource",
        id: 2,
        params: {
          uri: "storage://test-key",
          key: "test-key"
        }
      });
      
      // Wait for the response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback).toHaveBeenCalled();
      const response = mockCallback.mock.calls[0][0];
      expect(response.result.contents[0].text).toBe('test-value');
    });
  });
  
  describe('UI Integration', () => {
    beforeEach(async () => {
      await setupTestEnvironment();
      setupCalculatorUI();
    });
    
    test('should handle calculator UI interaction', async () => {
      // Set up inputs
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
      await setupTestEnvironment();
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
  
  describe('End-to-End Workflows', () => {
    test('complete calculator workflow', async () => {
      const { transport } = await setupTestEnvironment();
      
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const testCases = [
        { a: 5, b: 3, expected: ['8', '2', '15', '1.6666666666666667'] }
      ];
      
      for (const { a, b, expected } of testCases) {
        for (let i = 0; i < operations.length; i++) {
          const message = {
            jsonrpc: "2.0" as const,
            method: "tool",
            id: i + 1,
            params: {
              name: "calculate",
              params: {
                operation: operations[i],
                a,
                b
              }
            }
          };
          
          const mockCallback = jest.fn();
          transport.onMessage(mockCallback);
          await transport.send(message);
          
          // Wait for the calculation to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          expect(mockCallback).toHaveBeenCalled();
          const response = mockCallback.mock.calls[0][0];
          expect(response.result.content[0].text).toBe(expected[i]);
        }
      }
    });
    
    test('complete storage workflow', async () => {
      const { transport } = await setupTestEnvironment();
      
      const testData = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];
      
      for (const { key, value } of testData) {
        // Store value
        await transport.send({
          jsonrpc: "2.0" as const,
          method: "tool",
          id: 1,
          params: {
            name: "set-storage",
            params: { key, value }
          }
        });
        
        // Wait for the storage operation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retrieve value
        const mockCallback = jest.fn();
        transport.onMessage(mockCallback);
        
        await transport.send({
          jsonrpc: "2.0" as const,
          method: "resource",
          id: 2,
          params: {
            uri: `storage://${key}`,
            key
          }
        });
        
        // Wait for the retrieval to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockCallback).toHaveBeenCalled();
        const response = mockCallback.mock.calls[0][0];
        expect(response.result.contents[0].text).toBe(value);
      }
    });
  });
});
