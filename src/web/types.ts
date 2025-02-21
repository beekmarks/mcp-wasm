export interface JSONRPCMessage {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: {
    name: string;
    params: Record<string, any>;
  };
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}
