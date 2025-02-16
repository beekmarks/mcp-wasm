import { ServerTransport, Message } from "@modelcontextprotocol/sdk/server/transport.js";

export class BrowserTransport implements ServerTransport {
  private messageQueue: Message[] = [];
  private listeners: ((message: Message) => void)[] = [];
  private initialized = false;

  async start(): Promise<void> {
    if (this.initialized) return;
    
    // Initialize browser-specific setup
    window.addEventListener("message", this.handleWindowMessage.bind(this));
    this.initialized = true;
    console.log('Browser transport initialized');
  }

  async stop(): Promise<void> {
    if (!this.initialized) return;
    
    // Cleanup
    window.removeEventListener("message", this.handleWindowMessage.bind(this));
    this.messageQueue = [];
    this.listeners = [];
    this.initialized = false;
    console.log('Browser transport stopped');
  }

  onMessage(listener: (message: Message) => void): void {
    this.listeners.push(listener);
  }

  async send(message: Message): Promise<void> {
    if (!this.initialized) {
      throw new Error('Transport not initialized');
    }

    // Post message to the browser context
    window.postMessage({
      type: "mcp-message",
      message: JSON.parse(JSON.stringify(message)) // Ensure message is serializable
    }, "*");
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (event.data && event.data.type === "mcp-message") {
      const message = event.data.message as Message;
      this.listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });
    }
  }
}
