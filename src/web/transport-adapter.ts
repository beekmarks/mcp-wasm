import { Transport } from './transport';
import { JSONRPCMessage, JSONRPCResponse } from './types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export class TransportAdapter {
  constructor(private transport: Transport, private server: McpServer) {}

  async connect(): Promise<void> {
    // Convert the transport.send method to return void
    const adaptedTransport = {
      ...this.transport,
      send: async (message: JSONRPCMessage): Promise<void> => {
        await this.transport.send(message);
      },
      start: async () => {
        // No-op since we already started the transport
      }
    };
    await this.server.connect(adaptedTransport);
  }
}
