import '@testing-library/jest-dom';

// Mock URL since it's not available in jsdom
global.URL = class URL {
  href: string;
  constructor(url: string) {
    this.href = url;
  }
} as any;

// Mock Vite's import.meta.env
declare global {
  namespace NodeJS {
    interface Global {
      import: {
        meta: {
          env: {
            VITE_TAVILY_API_KEY: string;
          };
        };
      };
    }
  }
}

// Set up import.meta.env mock
(global as any).import = {
  meta: {
    env: {
      VITE_TAVILY_API_KEY: process.env.VITE_TAVILY_API_KEY || 'test-api-key'
    }
  }
};

// Reset environment before each test
beforeEach(() => {
  // Clear any mocks if needed
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
