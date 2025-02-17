import { JSONRPCMessage, JSONRPCResponse } from './types';

export interface Transport {
  start(): Promise<void>;
  stop(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  onMessage(callback: (response: JSONRPCResponse) => void): () => void;
  send(message: JSONRPCMessage): Promise<JSONRPCResponse>;
}
