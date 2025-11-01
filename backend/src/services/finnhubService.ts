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
      // FREE TIER: Only fetch company news (basic endpoint)
      // Premium endpoints (news-sentiment, social-sentiment) return 403 on free tier
      const companyNews = await this.getCompanyNews(symbol);

      if (companyNews && companyNews.length > 0) {
        data.companyNews = companyNews;
        data.articleCount = companyNews.length;

        // Do our own sentiment analysis on headlines and summaries
        const sentiment = this.analyzeSentiment(companyNews);
        data.sentimentScore = sentiment.score;

        console.log(`Finnhub data for ${symbol}:`, {
          sentimentScore: data.sentimentScore.toFixed(2),
          articles: data.articleCount,
          sentiment: sentiment.score > 0.05 ? 'Bullish' : sentiment.score < -0.05 ? 'Bearish' : 'Neutral'
        });
      } else {
        console.log(`Finnhub: No news articles found for ${symbol}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching Finnhub data:', error.message);
      return this.getEmptyData();
    }
  }

  private analyzeSentiment(articles: FinnhubNewsArticle[]): { score: number; bullish: number; bearish: number } {
    const bullishKeywords = [
      'surge', 'rally', 'soar', 'jump', 'gain', 'rise', 'upgrade', 'beat', 'approval',
      'breakthrough', 'success', 'growth', 'positive', 'strong', 'record', 'wins',
      'bullish', 'momentum', 'outperform', 'buy', 'profit', 'boost'
    ];

    const bearishKeywords = [
      'plunge', 'crash', 'fall', 'drop', 'decline', 'downgrade', 'miss', 'loss',
      'cut', 'lawsuit', 'investigation', 'concern', 'warning', 'negative', 'weak',
      'bearish', 'sell', 'risk', 'threat', 'trouble', 'slump', 'fails'
    ];

    let bullishCount = 0;
    let bearishCount = 0;

    articles.forEach(article => {
      const text = `${article.headline} ${article.summary}`.toLowerCase();

      bullishKeywords.forEach(keyword => {
        if (text.includes(keyword)) bullishCount++;
      });

      bearishKeywords.forEach(keyword => {
        if (text.includes(keyword)) bearishCount++;
      });
    });

    const totalKeywords = bullishCount + bearishCount;
    if (totalKeywords === 0) {
      return { score: 0, bullish: 0, bearish: 0 };
    }

    // Score from -1 to 1
    const score = (bullishCount - bearishCount) / Math.max(totalKeywords, 10);

    return {
      score: Math.max(-1, Math.min(1, score)),
      bullish: bullishCount,
      bearish: bearishCount
    };
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
