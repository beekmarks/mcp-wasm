import '@testing-library/jest-dom';

// Mock URL since it's not available in jsdom
global.URL = class URL {
  href: string;
  constructor(url: string) {
    this.href = url;
  }
} as any;

// Reset environment before each test
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset storage
  localStorage.clear();
  
  // Reset server state
  jest.resetModules();
});
