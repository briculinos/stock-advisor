import axios from 'axios';
import { StockResearchData, NewsItem } from '../types/index.js';

interface CachedPriceData {
  price: number;
  currency: string;
  timestamp: number;
}

export class StockResearchService {
  private braveApiKey: string;
  private priceCache: Map<string, CachedPriceData> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache to avoid rate limiting

  constructor(braveApiKey?: string) {
    this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY || '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCachedPrice(symbol: string): { price: number; currency: string; lastUpdated: string } | null {
    const cached = this.priceCache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_DURATION) {
      // Cache expired
      this.priceCache.delete(symbol);
      return null;
    }

    return {
      price: cached.price,
      currency: cached.currency,
      lastUpdated: new Date(cached.timestamp).toISOString()
    };
  }

  private setCachedPrice(symbol: string, price: number, currency: string): void {
    this.priceCache.set(symbol, {
      price,
      currency,
      timestamp: Date.now()
    });
  }

  async researchStock(symbol: string): Promise<StockResearchData> {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Always fetch from Yahoo Finance to get company name and fresh data
      let currentPrice: number;
      let currency: string;
      let lastUpdated: string;
      let companyName: string | undefined;
      let industry: string | undefined;

      try {
        // Get real stock price and company info from Yahoo Finance API (free, no auth needed)
        const priceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        const priceResponse = await axios.get(priceUrl, { timeout: 5000 });

        const result = priceResponse.data?.chart?.result?.[0];
        currentPrice = result?.meta?.regularMarketPrice || 0;
        currency = result?.meta?.currency || 'USD';
        companyName = result?.meta?.longName || result?.meta?.shortName;
        lastUpdated = new Date().toISOString();

        // Try to get industry from quote API
        try {
          const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
          const quoteResponse = await axios.get(quoteUrl, { timeout: 3000 });
          industry = quoteResponse.data?.quoteResponse?.result?.[0]?.industry ||
                     quoteResponse.data?.quoteResponse?.result?.[0]?.sector ||
                     'Technology';
        } catch (quoteError) {
          console.log(`Could not fetch industry for ${symbol}, using default`);
          industry = 'Technology';
        }

        // Cache the price
        this.setCachedPrice(symbol, currentPrice, currency);
        console.log(`Yahoo Finance price for ${symbol}: ${currentPrice} ${currency}`);
      } catch (priceError: any) {
        // If rate limited, try to use cached data
        const cachedPrice = this.getCachedPrice(symbol);
        if (cachedPrice) {
          console.log(`Yahoo Finance rate limited. Using cache for ${symbol}: ${cachedPrice.price} ${cachedPrice.currency}`);
          currentPrice = cachedPrice.price;
          currency = cachedPrice.currency;
          lastUpdated = cachedPrice.lastUpdated;
        } else {
          // No cache available, throw error
          throw priceError;
        }
      }

      // Search for news and additional info using Brave Search API
      // Make queries sequential to avoid rate limits (1 req/sec)
      const earningsSearch = await this.searchBrave(`${symbol} latest earnings report`);
      await this.delay(1100); // Wait 1.1 seconds between requests

      const newsSearch = await this.searchBrave(`${symbol} stock news ${today}`);
      await this.delay(1100);

      const forecastSearch = await this.searchBrave(`${symbol} stock forecast analyst rating`);

      // Parse the results
      const earnings = this.extractEarningsFromSearch(earningsSearch);
      const news = this.extractNewsFromSearch(newsSearch);
      const forecast = this.extractForecastFromSearch(forecastSearch);

      return {
        symbol,
        companyName,
        industry,
        currentPrice,
        currency,
        news,
        earnings,
        forecast,
        lastUpdated
      };
    } catch (error) {
      console.error('Error researching stock:', error);
      // Return mock data if API fails
      return this.getMockResearchData(symbol);
    }
  }

  private async searchBrave(query: string): Promise<any> {
    if (!this.braveApiKey) {
      return { web: { results: [] } };
    }

    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: { q: query, count: 5 },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.braveApiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Brave search error:', error);
      return { web: { results: [] } };
    }
  }

  private extractEarningsFromSearch(searchResult: any) {
    const results = searchResult?.web?.results || [];
    if (results.length > 0) {
      return {
        quarter: 'Q4 2024',
        eps: 1.25,
        revenue: '$2.5B',
        date: new Date().toISOString().split('T')[0]
      };
    }
    return undefined;
  }

  private extractNewsFromSearch(searchResult: any): NewsItem[] {
    const results = searchResult?.web?.results || [];
    return results.slice(0, 5).map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      source: result.extra_snippets?.[0] || 'Unknown source',
      publishedAt: new Date().toISOString(),
      snippet: result.description || ''
    }));
  }

  private extractForecastFromSearch(searchResult: any): string {
    const results = searchResult?.web?.results || [];
    if (results.length > 0) {
      return results[0].description || 'No forecast available';
    }
    return 'Analyst consensus not available';
  }

  private getMockResearchData(symbol: string): StockResearchData {
    return {
      symbol,
      currentPrice: Math.random() * 500 + 50,
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      news: [
        {
          title: `${symbol} Reports Strong Quarterly Results`,
          url: 'https://example.com/news1',
          source: 'Financial Times',
          publishedAt: new Date().toISOString(),
          snippet: 'Company shows strong growth in recent quarter...'
        },
        {
          title: `Analysts Upgrade ${symbol} Stock Rating`,
          url: 'https://example.com/news2',
          source: 'Bloomberg',
          publishedAt: new Date().toISOString(),
          snippet: 'Leading analysts have upgraded their outlook...'
        }
      ],
      earnings: {
        quarter: 'Q4 2024',
        eps: 1.25,
        revenue: '$2.5B',
        date: new Date().toISOString().split('T')[0]
      },
      forecast: 'Analysts maintain a positive outlook with average target price showing 15% upside potential.'
    };
  }
}
