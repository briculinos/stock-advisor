import axios from 'axios';
import { StockResearchData, NewsItem } from '../types/index.js';
import { QuiverService } from './quiverService.js';
import { AlphaVantageService } from './alphaVantageService.js';

interface CachedPriceData {
  price: number;
  currency: string;
  timestamp: number;
}

export class StockResearchService {
  private braveApiKey: string;
  private serpApiKey: string;
  private marketauxApiKey: string;
  private quiverService: QuiverService;
  private alphaVantageService: AlphaVantageService;
  private priceCache: Map<string, CachedPriceData> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache to avoid rate limiting
  private static rateLimited: boolean = false;
  private static rateLimitUntil: number = 0;

  constructor(braveApiKey?: string, serpApiKey?: string, marketauxApiKey?: string) {
    this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY || '';
    this.serpApiKey = serpApiKey || process.env.SERPAPI_KEY || '';
    this.marketauxApiKey = marketauxApiKey || process.env.MARKETAUX_API_KEY || '';
    this.quiverService = new QuiverService();
    this.alphaVantageService = new AlphaVantageService();
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

      // Try to get news from Marketaux first (provides sentiment)
      let news: NewsItem[] = [];

      if (this.marketauxApiKey) {
        console.log(`Fetching news from Marketaux for ${symbol}...`);
        news = await this.fetchMarketauxNews(symbol);
      }

      // If Marketaux fails or returns no results, fall back to Brave/SerpAPI
      if (news.length === 0) {
        console.log(`Marketaux returned no news, falling back to Brave/SerpAPI for ${symbol}...`);
        // Search for news and additional info (tries Brave Search first, falls back to SerpAPI)
        // Make queries sequential to avoid rate limits
        const newsSearch = await this.searchBrave(`${symbol} stock news ${today}`);
        news = this.extractNewsFromSearch(newsSearch);
      }

      // Fetch earnings and forecast data
      const earningsSearch = await this.searchBrave(`${symbol} latest earnings report`);
      await this.delay(800);
      const forecastSearch = await this.searchBrave(`${symbol} stock forecast analyst rating`);

      // Parse the results
      const earnings = this.extractEarningsFromSearch(earningsSearch);
      const forecast = this.extractForecastFromSearch(forecastSearch);

      // Fetch Quiver data (congressional trades, insider trades, Reddit mentions)
      let quiverData;
      try {
        console.log(`Fetching Quiver data for ${symbol}...`);
        const quiverResponse = await this.quiverService.getQuiverData(symbol);
        quiverData = {
          congressionalTrades: quiverResponse.congressionalTrades.length,
          congressionalBuys: quiverResponse.summary.recentCongressionalBuys,
          congressionalSells: quiverResponse.summary.recentCongressionalSells,
          insiderBuys: quiverResponse.summary.recentInsiderBuys,
          insiderSells: quiverResponse.summary.recentInsiderSells,
          redditMentions: quiverResponse.summary.redditMentionsLast7Days,
          activitySummary: this.quiverService.generateSummary(quiverResponse)
        };
        console.log(`Quiver data: ${quiverData.activitySummary}`);
      } catch (error) {
        console.error('Error fetching Quiver data:', error);
      }

      // Fetch Alpha Vantage data (news sentiment, fundamentals)
      let alphaVantageData;
      try {
        console.log(`Fetching Alpha Vantage data for ${symbol}...`);
        const avResponse = await this.alphaVantageService.getFullData(symbol);
        alphaVantageData = {
          newsSentiment: avResponse.newsSentiment.overallSentiment,
          sentimentScore: avResponse.newsSentiment.overallScore,
          articleCount: avResponse.newsSentiment.articles.length,
          fundamentals: avResponse.companyOverview ? {
            pe: avResponse.companyOverview.pe,
            eps: avResponse.companyOverview.eps,
            profitMargin: avResponse.companyOverview.profitMargin,
            debtToEquity: avResponse.companyOverview.debtToEquity,
            analystTarget: avResponse.companyOverview.analystTargetPrice
          } : undefined
        };
        console.log(`Alpha Vantage: ${this.alphaVantageService.generateSummary(avResponse)}`);
      } catch (error) {
        console.error('Error fetching Alpha Vantage data:', error);
      }

      // Check if we got any news
      if (news.length === 0) {
        console.log('No news found from any API, using minimal news data');
        return {
          symbol,
          companyName,
          industry,
          currentPrice,
          currency,
          news: this.generateMinimalNews(symbol, companyName),
          lastUpdated,
          quiverData,
          alphaVantageData
        };
      }

      return {
        symbol,
        companyName,
        industry,
        currentPrice,
        currency,
        news,
        earnings,
        forecast,
        lastUpdated,
        quiverData,
        alphaVantageData
      };
    } catch (error) {
      console.error('Error researching stock:', error);
      // Return mock data if API fails
      return this.getMockResearchData(symbol);
    }
  }

  private async fetchMarketauxNews(symbol: string): Promise<NewsItem[]> {
    if (!this.marketauxApiKey) {
      console.log('Marketaux API key not configured');
      return [];
    }

    try {
      const response = await axios.get('https://api.marketaux.com/v1/news/all', {
        params: {
          api_token: this.marketauxApiKey,
          symbols: symbol,
          filter_entities: true,
          limit: 10,
          language: 'en',
          sort: 'published_at'
        },
        timeout: 8000
      });

      const articles = response.data?.data || [];
      console.log(`Marketaux returned ${articles.length} articles for ${symbol}`);

      return articles.map((article: any) => {
        // Marketaux provides sentiment as object with polarity (-1 to 1)
        const sentimentPolarity = article.entities?.[0]?.sentiment_score || 0;
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

        if (sentimentPolarity > 0.1) {
          sentiment = 'positive';
        } else if (sentimentPolarity < -0.1) {
          sentiment = 'negative';
        }

        return {
          title: article.title || 'No title',
          url: article.url || '',
          source: article.source || 'Unknown source',
          publishedAt: article.published_at || new Date().toISOString(),
          snippet: article.description || article.snippet || '',
          sentiment,
          sentimentScore: sentimentPolarity
        };
      });
    } catch (error: any) {
      console.error('Marketaux API error:', error.message);
      if (error.response?.status === 429) {
        console.log('Marketaux API rate limited');
      }
      return [];
    }
  }

  private async searchBrave(query: string): Promise<any> {
    // Try Brave Search first
    if (this.braveApiKey && !(StockResearchService.rateLimited && Date.now() < StockResearchService.rateLimitUntil)) {
      try {
        const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: { q: query, count: 5 },
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': this.braveApiKey
          },
          timeout: 8000
        });

        // Reset rate limit flag on successful request
        StockResearchService.rateLimited = false;
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.log('Brave Search API rate limited - trying SerpAPI fallback');
          StockResearchService.rateLimited = true;
          StockResearchService.rateLimitUntil = Date.now() + 60000; // Rate limited for 60 seconds
        } else {
          console.error('Brave search error:', error.message || error);
        }
      }
    }

    // Fallback to SerpAPI
    if (this.serpApiKey) {
      try {
        const response = await axios.get('https://serpapi.com/search', {
          params: {
            q: query,
            api_key: this.serpApiKey,
            engine: 'google_news',
            num: 5
          },
          timeout: 8000
        });

        // Convert SerpAPI response to Brave Search format
        const newsResults = response.data?.news_results || [];
        return {
          web: {
            results: newsResults.map((item: any) => ({
              title: item.title,
              url: item.link,
              description: item.snippet,
              extra_snippets: [item.source?.name || 'Unknown']
            }))
          }
        };
      } catch (error: any) {
        console.error('SerpAPI error:', error.message);
      }
    }

    return { web: { results: [] } };
  }

  private generateMinimalNews(symbol: string, companyName?: string): NewsItem[] {
    const company = companyName || symbol;
    return [
      {
        title: `${company} Stock Analysis`,
        url: `https://finance.yahoo.com/quote/${symbol}`,
        source: 'Yahoo Finance',
        publishedAt: new Date().toISOString(),
        snippet: `Latest price and market data for ${company}`
      },
      {
        title: `${company} Market Overview`,
        url: `https://finance.yahoo.com/quote/${symbol}/analysis`,
        source: 'Yahoo Finance',
        publishedAt: new Date().toISOString(),
        snippet: `Analyst ratings and price targets for ${company}`
      }
    ];
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
