import axios from 'axios';

export interface FinnhubNewsArticle {
  category: string;
  datetime: number; // Unix timestamp
  headline: string;
  id: number;
  image: string;
  related: string; // Stock symbol
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubNewsSentiment {
  symbol: string;
  companyNewsScore: number; // -1 to 1
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: {
    bearishPercent: number;
    bullishPercent: number;
  };
  buzz: {
    articlesInLastWeek: number;
    weeklyAverage: number;
    buzz: number; // Relative buzz
  };
}

export interface FinnhubSocialSentiment {
  symbol: string;
  data: Array<{
    atTime: string; // ISO date
    mention: number;
    positiveScore: number;
    negativeScore: number;
    positiveMention: number;
    negativeMention: number;
    score: number; // Net sentiment
  }>;
}

export interface FinnhubData {
  newsSentiment?: FinnhubNewsSentiment;
  socialSentiment?: FinnhubSocialSentiment;
  companyNews: FinnhubNewsArticle[];
  sentimentScore: number; // Normalized -1 to 1
  articleCount: number;
  redditMentions: number; // For moonshot scoring
  redditSentiment: number; // -1 to 1
}

export class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FINNHUB_API_KEY || '';
  }

  async getFinnhubData(symbol: string): Promise<FinnhubData> {
    if (!this.apiKey) {
      console.log('Finnhub API key not configured');
      return this.getEmptyData();
    }

    const data: FinnhubData = {
      companyNews: [],
      sentimentScore: 0,
      articleCount: 0,
      redditMentions: 0,
      redditSentiment: 0
    };

    try {
      // Fetch news sentiment, social sentiment, and company news in parallel
      const [newsSentiment, socialSentiment, companyNews] = await Promise.allSettled([
        this.getNewsSentiment(symbol),
        this.getSocialSentiment(symbol),
        this.getCompanyNews(symbol)
      ]);

      // Process news sentiment
      if (newsSentiment.status === 'fulfilled' && newsSentiment.value) {
        data.newsSentiment = newsSentiment.value;
        data.sentimentScore = newsSentiment.value.companyNewsScore;
        data.articleCount = newsSentiment.value.buzz.articlesInLastWeek;
      }

      // Process social sentiment (Reddit data)
      if (socialSentiment.status === 'fulfilled' && socialSentiment.value) {
        data.socialSentiment = socialSentiment.value;

        // Calculate Reddit mentions and sentiment from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentData = socialSentiment.value.data.filter(d =>
          new Date(d.atTime) >= sevenDaysAgo
        );

        data.redditMentions = recentData.reduce((sum, d) => sum + d.mention, 0);

        if (recentData.length > 0) {
          data.redditSentiment = recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length;
        }
      }

      // Process company news
      if (companyNews.status === 'fulfilled' && companyNews.value) {
        data.companyNews = companyNews.value;
      }

      console.log(`Finnhub data for ${symbol}:`, {
        sentimentScore: data.sentimentScore.toFixed(2),
        articles: data.articleCount,
        redditMentions: data.redditMentions,
        redditSentiment: data.redditSentiment.toFixed(2)
      });

      return data;
    } catch (error: any) {
      console.error('Error fetching Finnhub data:', error.message);
      return this.getEmptyData();
    }
  }

  private async getNewsSentiment(symbol: string): Promise<FinnhubNewsSentiment | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/news-sentiment`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        },
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('Finnhub news sentiment: Rate limit exceeded');
      } else {
        console.error('Error fetching Finnhub news sentiment:', error.message);
      }
      return null;
    }
  }

  private async getSocialSentiment(symbol: string): Promise<FinnhubSocialSentiment | null> {
    try {
      // Get social sentiment from Reddit
      const response = await axios.get(`${this.baseUrl}/stock/social-sentiment`, {
        params: {
          symbol: symbol,
          from: this.getDateDaysAgo(30), // Last 30 days
          to: this.getCurrentDate(),
          token: this.apiKey
        },
        timeout: 10000
      });

      return {
        symbol,
        data: response.data.reddit || []
      };
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('Finnhub social sentiment: Rate limit exceeded');
      } else {
        console.error('Error fetching Finnhub social sentiment:', error.message);
      }
      return null;
    }
  }

  private async getCompanyNews(symbol: string): Promise<FinnhubNewsArticle[]> {
    try {
      // Get last 7 days of company news
      const response = await axios.get(`${this.baseUrl}/company-news`, {
        params: {
          symbol: symbol,
          from: this.getDateDaysAgo(7),
          to: this.getCurrentDate(),
          token: this.apiKey
        },
        timeout: 10000
      });

      const articles = response.data || [];
      console.log(`Finnhub: Found ${articles.length} company news articles for ${symbol}`);

      return articles.slice(0, 20); // Limit to 20 most recent
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error('Finnhub company news: Rate limit exceeded');
      } else {
        console.error('Error fetching Finnhub company news:', error.message);
      }
      return [];
    }
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getEmptyData(): FinnhubData {
    return {
      companyNews: [],
      sentimentScore: 0,
      articleCount: 0,
      redditMentions: 0,
      redditSentiment: 0
    };
  }
}
