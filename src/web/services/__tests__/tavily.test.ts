import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TavilyService } from '../tavily';

jest.mock('@tavily/core', () => ({
  TavilyClient: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      results: [{ text: 'Test Result' }]
    }),
    extract: jest.fn().mockResolvedValue({
      text: 'Test extracted content'
    })
  }))
}));

describe('TavilyService', () => {
  let service: TavilyService;
  let server: McpServer;

  beforeEach(() => {
    service = new TavilyService('test-key');
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      implementation: 'test'
    });
  });

  test('should require API key', () => {
    expect(() => new TavilyService('')).toThrow('Tavily API key is required');
  });

  test('should perform search', async () => {
    service.registerTools(server);

    const response = await server.execute({
      name: 'tavily-search',
      params: {
        query: 'test query'
      }
    });
    expect(response.content[0].text).toBeDefined();
  });

  test('should handle search errors', async () => {
    service.registerTools(server);

    const response = await server.execute({
      name: 'tavily-search',
      params: {
        query: ''
      }
    });
    expect(response.content[0].text).toBeDefined();
  });

  test('should extract content', async () => {
    service.registerTools(server);

    const response = await server.execute({
      name: 'tavily-extract',
      params: {
        url: 'https://test.com'
      }
    });
    expect(response.content[0].text).toBeDefined();
  });

  test('should handle extraction errors', async () => {
    service.registerTools(server);

    const response = await server.execute({
      name: 'tavily-extract',
      params: {
        url: ''
      }
    });
    expect(response.content[0].text).toBeDefined();
import { TavilyService } from '../tavily';

// Mock TavilyClient
jest.mock('@tavily/core', () => ({
  TavilyClient: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      answer: 'Test answer',
      results: [
        {
          title: 'Test result',
          url: 'https://test.com',
          content: 'Test content',
          score: 0.9
        }
      ]
    }),
    extract: jest.fn().mockResolvedValue([{
      url: 'https://test.com',
      title: 'Test title',
      content: 'Test content',
      images: ['https://test.com/image.jpg']
    }])
  }))
}));

describe('TavilyService', () => {
  let service: TavilyService;

  beforeEach(() => {
    service = new TavilyService('test-api-key');
  });

  describe('search', () => {
    test('should perform basic search', async () => {
      const result = await service.search({
        query: 'test query'
      });

      expect(result).toEqual({
        answer: 'Test answer',
        results: [
          {
            title: 'Test result',
            url: 'https://test.com',
            content: 'Test content',
            score: 0.9
          }
        ]
      });
    });

    test('should handle search with raw content', async () => {
      const result = await service.search({
        query: 'test query',
        include_raw_content: true
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).toBeTruthy();
    });

    test('should handle search error', async () => {
      const errorService = new TavilyService();
      await expect(errorService.search({
        query: 'test query'
      })).rejects.toThrow('Client not initialized');
    });

    test('should handle missing API key', async () => {
      const errorService = new TavilyService();
      await expect(errorService.search({
        query: 'test query'
      })).rejects.toThrow('Client not initialized');
    });
  });

  describe('extract', () => {
    test('should extract content from a URL', async () => {
      const result = await service.extract('https://test.com');

      expect(result).toEqual({
        url: 'https://test.com',
        title: 'Test title',
        content: 'Test content',
        images: ['https://test.com/image.jpg']
      });
    });
  });
});
  });
});
