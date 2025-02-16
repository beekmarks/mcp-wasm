import { BrowserTransport } from '../browser-transport';

describe('BrowserTransport', () => {
  let transport: BrowserTransport;

  beforeEach(() => {
    transport = new BrowserTransport(true); // Enable test mode
  });

  afterEach(async () => {
    await transport.stop();
  });

  test('should start and stop correctly', async () => {
    await transport.start();
    expect(transport.isConnected()).toBe(true);

    await transport.stop();
    expect(transport.isConnected()).toBe(false);
  });

  test('should send messages when connected', async () => {
    await transport.start();
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    const mockCallback = jest.fn();
    transport.onMessage(mockCallback);
    await transport.send(message);

    expect(mockCallback).toHaveBeenCalledWith(message);
  });

  test('should handle multiple message callbacks', async () => {
    await transport.start();
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    transport.onMessage(mockCallback1);
    transport.onMessage(mockCallback2);

    await transport.send(message);

    expect(mockCallback1).toHaveBeenCalledWith(message);
    expect(mockCallback2).toHaveBeenCalledWith(message);
  });

  test('should throw error when sending message while not connected', async () => {
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    await expect(transport.send(message)).rejects.toThrow('Transport not connected');
  });

  test('should remove message callback when cleanup function is called', async () => {
    await transport.start();
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    const mockCallback = jest.fn();
    const cleanup = transport.onMessage(mockCallback);
    await transport.send(message);
    expect(mockCallback).toHaveBeenCalledWith(message);

    mockCallback.mockClear();
    cleanup();
    await transport.send(message);
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should handle multiple messages in sequence', async () => {
    await transport.start();
    const messages = [
      {
        jsonrpc: "2.0" as const,
        method: "test1",
        id: 1,
        params: {
          data: "test data 1"
        }
      },
      {
        jsonrpc: "2.0" as const,
        method: "test2",
        id: 2,
        params: {
          data: "test data 2"
        }
      }
    ];

    const mockCallback = jest.fn();
    transport.onMessage(mockCallback);

    for (const message of messages) {
      await transport.send(message);
    }

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, messages[0]);
    expect(mockCallback).toHaveBeenNthCalledWith(2, messages[1]);
  });

  test('should handle window message events', async () => {
    await transport.start();
    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: 1,
      params: {
        data: "test data"
      }
    };

    const mockCallback = jest.fn();
    transport.onMessage(mockCallback);

    window.postMessage({
      type: "mcp-message",
      message
    }, "*");

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockCallback).toHaveBeenCalledWith(message);
  });
});
