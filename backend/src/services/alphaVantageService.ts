import axios from 'axios';

export interface NewsSentiment {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  sentimentScore: number; // 0 to 1 scale (0 = very bearish, 0.5 = neutral, 1 = very bullish)
  relevanceScore: number; // 0 to 1 scale
}

export interface CompanyOverview {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: string;
  pe: string;
  eps: string;
  dividendYield: string;
  profitMargin: string;
  operatingMargin: string;
  returnOnEquity: string;
  debtToEquity: string;
  analystTargetPrice: string;
}

export interface AlphaVantageData {
  newsSentiment: {
    overallSentiment: 'Bullish' | 'Neutral' | 'Bearish';
    overallScore: number; // -1 to 1 scale
    articles: NewsSentiment[];
  };
  companyOverview?: CompanyOverview;
}

export class AlphaVantageService {
  private rapidApiKey: string;
  private baseUrl = 'https://alpha-vantage.p.rapidapi.com';

  constructor(rapidApiKey?: string) {
    this.rapidApiKey = rapidApiKey || process.env.RAPIDAPI_KEY || '';
  }

  private getRapidApiHeaders() {
    return {
      'X-RapidAPI-Key': this.rapidApiKey,
      'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
    };
  }

  async getNewsSentiment(symbol: string): Promise<AlphaVantageData['newsSentiment']> {
    if (!this.rapidApiKey) {
      console.log('RapidAPI key not configured for Alpha Vantage');
      return this.getEmptySentiment();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: symbol,
          limit: 50,
          sort: 'LATEST'
        },
        headers: this.getRapidApiHeaders(),
        timeout: 10000
      });

      const feed = response.data?.feed || [];
      console.log(`Alpha Vantage: Found ${feed.length} news articles with sentiment for ${symbol}`);

      if (feed.length === 0) {
        return this.getEmptySentiment();
      }

      const articles: NewsSentiment[] = feed.slice(0, 10).map((article: any) => {
        // Find ticker-specific sentiment
        const tickerSentiment = article.ticker_sentiment?.find((ts: any) =>
          ts.ticker === symbol
        );

        const sentimentScore = tickerSentiment?.ticker_sentiment_score || 0;
        const relevanceScore = tickerSentiment?.relevance_score || 0;

        // Convert sentiment score to sentiment label
        let sentiment: 'Bullish' | 'Neutral' | 'Bearish' = 'Neutral';
        if (sentimentScore > 0.15) {
          sentiment = 'Bullish';
        } else if (sentimentScore < -0.15) {
          sentiment = 'Bearish';
        }

        return {
          title: article.title || 'No title',
          url: article.url || '',
          source: article.source || 'Unknown',
          publishedAt: article.time_published || new Date().toISOString(),
          summary: article.summary || '',
          sentiment,
          sentimentScore: (sentimentScore + 1) / 2, // Convert -1 to 1 scale to 0 to 1 scale
          relevanceScore
        };
      });

      // Calculate overall sentiment
      const relevantArticles = articles.filter(a => a.relevanceScore > 0.3);
      const avgScore = relevantArticles.length > 0
        ? relevantArticles.reduce((sum, a) => sum + (a.sentimentScore - 0.5) * 2, 0) / relevantArticles.length
        : 0;

      let overallSentiment: 'Bullish' | 'Neutral' | 'Bearish' = 'Neutral';
      if (avgScore > 0.15) {
        overallSentiment = 'Bullish';
      } else if (avgScore < -0.15) {
        overallSentiment = 'Bearish';
      }

      return {
        overallSentiment,
        overallScore: avgScore,
        articles
      };
    } catch (error: any) {
      console.error('Error fetching Alpha Vantage news sentiment:', error.message);
      if (error.response?.status === 429) {
        console.log('Alpha Vantage: Rate limit exceeded');
      }
      return this.getEmptySentiment();
    }
  }

  async getCompanyOverview(symbol: string): Promise<CompanyOverview | null> {
    if (!this.rapidApiKey) {
      console.log('RapidAPI key not configured for Alpha Vantage');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/query`, {
        params: {
          function: 'OVERVIEW',
          symbol: symbol
        },
        headers: this.getRapidApiHeaders(),
        timeout: 10000
      });

      const data = response.data;

      if (!data || !data.Symbol) {
        console.log(`Alpha Vantage: No company overview found for ${symbol}`);
        return null;
      }

      console.log(`Alpha Vantage: Retrieved company overview for ${symbol}`);

      return {
        symbol: data.Symbol,
        name: data.Name,
        sector: data.Sector || 'Unknown',
        industry: data.Industry || 'Unknown',
        marketCap: data.MarketCapitalization || 'N/A',
        pe: data.PERatio || 'N/A',
        eps: data.EPS || 'N/A',
        dividendYield: data.DividendYield || 'N/A',
        profitMargin: data.ProfitMargin || 'N/A',
        operatingMargin: data.OperatingMarginTTM || 'N/A',
        returnOnEquity: data.ReturnOnEquityTTM || 'N/A',
        debtToEquity: data.DebtToEquity || 'N/A',
        analystTargetPrice: data.AnalystTargetPrice || 'N/A'
      };
    } catch (error: any) {
      console.error('Error fetching Alpha Vantage company overview:', error.message);
      return null;
    }
  }

  async getFullData(symbol: string): Promise<AlphaVantageData> {
    const [sentiment, overview] = await Promise.allSettled([
      this.getNewsSentiment(symbol),
      this.getCompanyOverview(symbol)
    ]);

    return {
      newsSentiment: sentiment.status === 'fulfilled' ? sentiment.value : this.getEmptySentiment(),
      companyOverview: overview.status === 'fulfilled' ? overview.value || undefined : undefined
    };
  }

  private getEmptySentiment(): AlphaVantageData['newsSentiment'] {
    return {
      overallSentiment: 'Neutral',
      overallScore: 0,
      articles: []
    };
  }

  // Helper to generate summary text
  generateSummary(data: AlphaVantageData): string {
    const parts: string[] = [];

    if (data.newsSentiment.articles.length > 0) {
      const sentiment = data.newsSentiment.overallSentiment;
      const score = (data.newsSentiment.overallScore * 100).toFixed(0);
      const emoji = sentiment === 'Bullish' ? '🟢' : sentiment === 'Bearish' ? '🔴' : '🟡';
      parts.push(`News: ${emoji} ${sentiment} (${score}%)`);
    }

    if (data.companyOverview) {
      const co = data.companyOverview;
      parts.push(`PE: ${co.pe} | Margin: ${co.profitMargin}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No data available';
  }
}
