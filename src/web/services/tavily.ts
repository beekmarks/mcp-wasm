import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tavily } from '@tavily/core';
import { z } from 'zod';

export interface TavilySearchParams {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'general' | 'news';
  days?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  maxResults?: number;
  includeImages?: boolean;
  includeImageDescriptions?: boolean;
  includeAnswer?: boolean | 'basic' | 'advanced';
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  rawContent?: string;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  responseTime?: number;
  images?: Array<{
    url: string;
    description?: string;
  }>;
}

export interface TavilyExtractResponse {
  url: string;
  title: string;
  content: string;
  images?: string[];
}

export class TavilyService {
  private client: any = null;

  constructor(private apiKey?: string) {
    const apiKeyEnv = process.env.VITE_TAVILY_API_KEY;
    if (apiKey || apiKeyEnv) {
      this.client = tavily({ apiKey: apiKey || apiKeyEnv || '' });
    }
  }

  async search(params: TavilySearchParams): Promise<TavilySearchResponse> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    console.log('Using Tavily API');
    console.log('Executing search...');

    const results = await this.client.search(params.query, {
      searchDepth: params.searchDepth || 'advanced',
      includeAnswer: true,
      maxResults: params.maxResults || 5,
      includeRawContent: params.includeRawContent,
      includeImages: params.includeImages
    });

    console.log('Search completed:', results);

    return {
      query: results.query,
      answer: results.answer,
      results: results.results,
      responseTime: results.responseTime,
      images: results.images
    };
  }

  async extract(url: string, params?: { includeImages?: boolean }): Promise<TavilyExtractResponse> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const responses = await this.client.extract([url], {
      includeImages: params?.includeImages
    });

    return responses[0];
  }

  registerTools(server: McpServer) {
    // Define schema for tavily-search
    const searchSchema = z.object({
      query: z.string(),
      searchDepth: z.enum(['basic', 'advanced']).optional(),
      topic: z.enum(['general', 'news']).optional(),
      days: z.number().optional(),
      timeRange: z.enum(['day', 'week', 'month', 'year']).optional(),
      maxResults: z.number().optional(),
      includeImages: z.boolean().optional(),
      includeImageDescriptions: z.boolean().optional(),
      includeAnswer: z.union([z.boolean(), z.enum(['basic', 'advanced'])]).optional(),
      includeRawContent: z.boolean().optional(),
      includeDomains: z.array(z.string()).optional(),
      excludeDomains: z.array(z.string()).optional()
    }).strict();

    server.tool('tavily-search', 'Search the web using Tavily', searchSchema.shape, async (extra: RequestHandlerExtra) => {
      try {
        const result = await this.search(extra.params);
        return {
          content: [{ text: JSON.stringify(result), type: 'text' }]
        };
      } catch (error) {
        return {
          content: [{ text: `Error performing search: ${error}`, type: 'text' }]
        };
      }
    });

    // Define schema for tavily-extract
    const extractSchema = z.object({
      url: z.string(),
      includeImages: z.boolean().optional()
    }).strict();

    server.tool('tavily-extract', 'Extract content from a URL', extractSchema.shape, async (extra: RequestHandlerExtra) => {
      try {
        const result = await this.extract(extra.params.url, { includeImages: extra.params.includeImages });
        return {
          content: [{ text: JSON.stringify(result), type: 'text' }]
        };
      } catch (error) {
        return {
          content: [{ text: `Error extracting content: ${error}`, type: 'text' }]
        };
      }
    });
  }
}
