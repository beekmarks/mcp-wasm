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
  result?: {
    contents?: Array<{
      type: string;
      text: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}
