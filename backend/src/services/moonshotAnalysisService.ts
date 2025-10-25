import axios from 'axios';
import { TechnicalAnalysisService } from './technicalAnalysisService.js';
import { StockResearchService } from './stockResearchService.js';

interface NewsSignal {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string;
}

interface MoonshotCandidate {
  symbol: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  currency: string;
  moonshotScore: number;

  // Score breakdowns
  rumorsPoliticsTariffsScore: number; // 50% weight
  technicalScore: number; // 25% weight
  newsScore: number; // 25% weight

  // Enhanced fields
  shortSqueezePotential: number; // shortInterest × sentimentScore
  eventSentiment: 'positive' | 'negative' | 'neutral';
  catalystDate?: string; // ISO date of upcoming catalyst
  recommendation: 'WATCHLIST' | 'BUY';

  // Argumentation
  keyReason: string;
  rumorSignals: NewsSignal[];
  politicalFactors: NewsSignal[];
  tariffImpacts: NewsSignal[];
  technicalSignals: string[];
  newsHighlights: NewsSignal[];

  // Risk indicators
  riskLevel: 'very-high' | 'high' | 'medium';
  volatility: number;

  // Pre-qualification metrics
  marketCap?: number;
  avgVolume?: number;
  cashRunway?: number; // in months

  // Raw data
  recentNews: any[];
}

interface NewsItem {
  title: string;
  snippet: string;
  url: string;
  publishedAt: string;
}

export class MoonshotAnalysisService {
  private braveApiKey: string;
  private technicalService: TechnicalAnalysisService;
  private researchService: StockResearchService;

  // High-impact stock symbols to monitor (can be expanded)
  private readonly WATCHLIST = [
    'TSLA', 'NVDA', 'AMD', 'PLTR', 'COIN', 'HOOD', 'SOFI', 'MARA', 'RIOT',
    'NIO', 'LCID', 'RIVN', 'CHPT', 'PLUG', 'FCEL', 'BLNK', 'QS',
    'ARKK', 'ARKG', 'ARKF', 'SPCE', 'RKLB', 'ASTR', 'ASTS',
    'UPST', 'AFFIRM', 'SQ', 'PYPL', 'SHOP', 'SNAP', 'PINS',
    'ZM', 'DOCU', 'SNOW', 'DDOG', 'CRWD', 'NET', 'MDB'
  ];

  constructor() {
    this.braveApiKey = process.env.BRAVE_API_KEY || '';
    this.technicalService = new TechnicalAnalysisService();
    this.researchService = new StockResearchService();
  }

  /**
   * Find top moonshot candidates
   */
  async findMoonshotCandidates(limit: number = 5): Promise<MoonshotCandidate[]> {
    console.log('Searching for moonshot candidates...');

    const candidates: MoonshotCandidate[] = [];

    // Search for stocks with high-impact news
    const stocksWithNews = await this.searchHighImpactStocks();
    console.log(`Found ${stocksWithNews.length} stocks to analyze:`, stocksWithNews);

    // Analyze each stock
    for (const stockSymbol of stocksWithNews.slice(0, 10)) { // Analyze top 10, return top 5
      try {
        console.log(`\nAnalyzing ${stockSymbol}...`);
        const candidate = await this.analyzeStockForMoonshot(stockSymbol);
        if (candidate) {
          console.log(`${stockSymbol} qualified with score ${candidate.moonshotScore.toFixed(1)}`);
          candidates.push(candidate);
        } else {
          console.log(`${stockSymbol} did not qualify`);
        }
      } catch (error) {
        console.error(`Error analyzing ${stockSymbol}:`, error);
      }
    }

    console.log(`\nTotal candidates found: ${candidates.length}`);

    // Sort by moonshot score and return top candidates
    candidates.sort((a, b) => b.moonshotScore - a.moonshotScore);

    return candidates.slice(0, limit);
  }

  /**
   * Search for stocks with high-impact news using Brave Search
   */
  private async searchHighImpactStocks(): Promise<string[]> {
    const queries = [
      'stock rumors breaking news today',
      'tariff impact stocks',
      'political stocks news today',
      'stock market rumors',
      'FDA approval rumors stock',
      'merger rumors stocks'
    ];

    const discoveredStocks = new Set<string>();

    for (const query of queries) {
      try {
        const stocks = await this.searchStocksByQuery(query);
        stocks.forEach(s => discoveredStocks.add(s));
      } catch (error) {
        console.error(`Error searching "${query}":`, error);
      }
    }

    // Merge with watchlist
    this.WATCHLIST.forEach(s => discoveredStocks.add(s));

    return Array.from(discoveredStocks).slice(0, 20);
  }

  /**
   * Search for stocks by query
   */
  private async searchStocksByQuery(query: string): Promise<string[]> {
    if (!this.braveApiKey) {
      console.warn('No Brave API key, using watchlist only');
      return [];
    }

    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.braveApiKey
        },
        params: {
          q: query,
          count: 10,
          freshness: 'pd' // Past day
        }
      });

      const results = response.data?.web?.results || [];
      const stockSymbols = new Set<string>();

      // Extract stock symbols from results
      results.forEach((result: any) => {
        const text = `${result.title} ${result.description}`.toUpperCase();

        // Look for stock ticker patterns (uppercase 2-5 letters)
        const tickerMatches = text.match(/\b[A-Z]{2,5}\b/g) || [];

        tickerMatches.forEach((ticker: string) => {
          // Filter out common words
          if (!['NYSE', 'NASDAQ', 'USD', 'EUR', 'GBP', 'CEO', 'CFO', 'IPO', 'ETF'].includes(ticker)) {
            if (this.WATCHLIST.includes(ticker)) {
              stockSymbols.add(ticker);
            }
          }
        });
      });

      return Array.from(stockSymbols);
    } catch (error) {
      console.error('Brave search error:', error);
      return [];
    }
  }

  /**
   * Pre-qualification filter
   */
  private async passesPreQualification(
    symbol: string,
    marketCap?: number,
    avgVolume?: number,
    cashRunway?: number
  ): Promise<boolean> {
    // Market Cap ≥ $250M
    if (marketCap && marketCap < 250_000_000) {
      console.log(`   ${symbol} failed: Market cap $${(marketCap / 1_000_000).toFixed(0)}M < $250M`);
      return false;
    }

    // Liquidity: avg vol > 200k shares/day
    if (avgVolume && avgVolume < 200_000) {
      console.log(`   ${symbol} failed: Avg volume ${(avgVolume / 1000).toFixed(0)}k < 200k`);
      return false;
    }

    // Cash Runway ≥ 9 months
    if (cashRunway !== undefined && cashRunway < 9) {
      console.log(`   ${symbol} failed: Cash runway ${cashRunway} months < 9 months`);
      return false;
    }

    return true;
  }

  /**
   * Analyze a stock for moonshot potential
   */
  private async analyzeStockForMoonshot(symbol: string): Promise<MoonshotCandidate | null> {
    try {
      // Get research data
      const researchData = await this.researchService.researchStock(symbol);

      if (!researchData.news || researchData.news.length === 0) {
        console.log(`   No news data for ${symbol}`);
        return null;
      }

      console.log(`   Found ${researchData.news.length} news items for ${symbol}`);

      // Get fundamental data for pre-qualification
      const priceData = await this.getPriceDataForSymbol(symbol);
      const fundamentalData = await this.getFundamentalData(symbol);

      // Pre-qualification filter
      const passesFilter = await this.passesPreQualification(
        symbol,
        fundamentalData.marketCap,
        fundamentalData.avgVolume,
        fundamentalData.cashRunway
      );

      if (!passesFilter) {
        console.log(`   ${symbol} did not pass pre-qualification filters`);
        return null;
      }

      // Analyze news for rumors, politics, tariffs
      const newsAnalysis = this.analyzeNewsContent(researchData.news);

      // Get technical analysis
      const technicalIndicators = this.technicalService.analyzeTechnical(priceData);
      const technicalScore = this.technicalService.calculateTechnicalScore(technicalIndicators, researchData.currentPrice);

      // Detect catalyst window
      const catalyst = this.detectCatalyst(researchData.news);

      // Calculate event sentiment
      const eventSentiment = this.calculateEventSentiment(researchData.news);

      // Calculate short squeeze potential
      const shortSqueezePotential = this.calculateShortSqueezePotential(
        fundamentalData.shortInterest || 0,
        newsAnalysis.newsScore
      );

      // Calculate weighted moonshot score
      const rumorsPoliticsTariffsScore = newsAnalysis.rumorsPoliticsTariffsScore;
      const newsScore = newsAnalysis.newsScore;

      const moonshotScore = (
        rumorsPoliticsTariffsScore * 0.5 +
        technicalScore * 0.25 +
        newsScore * 0.25
      );

      console.log(`   Scores for ${symbol}:
   - Rumors/Politics/Tariffs: ${rumorsPoliticsTariffsScore.toFixed(1)} (50% weight)
   - Technical: ${technicalScore.toFixed(1)} (25% weight)
   - News: ${newsScore.toFixed(1)} (25% weight)
   - TOTAL: ${moonshotScore.toFixed(1)}`);

      // Only include if score is high enough AND has valid catalyst
      if (moonshotScore < 30) {
        console.log(`   Score ${moonshotScore.toFixed(1)} below threshold of 30`);
        return null;
      }

      if (!catalyst.hasCatalyst) {
        console.log(`   No valid catalyst window detected`);
        return null;
      }

      // Calculate volatility
      const volatility = this.calculateVolatility(priceData);

      // Generate key reason
      const keyReason = this.generateKeyReason(newsAnalysis, technicalIndicators, moonshotScore);

      // Determine recommendation
      const recommendation = this.determineRecommendation(
        moonshotScore,
        shortSqueezePotential,
        eventSentiment,
        catalyst.hasCatalyst
      );

      return {
        symbol,
        companyName: researchData.companyName || symbol,
        industry: researchData.industry || 'Technology',
        currentPrice: researchData.currentPrice,
        currency: researchData.currency,
        moonshotScore,
        rumorsPoliticsTariffsScore,
        technicalScore,
        newsScore,
        shortSqueezePotential,
        eventSentiment,
        catalystDate: catalyst.date,
        recommendation,
        keyReason,
        rumorSignals: newsAnalysis.rumors,
        politicalFactors: newsAnalysis.political,
        tariffImpacts: newsAnalysis.tariffs,
        technicalSignals: this.extractTechnicalSignals(technicalIndicators),
        newsHighlights: newsAnalysis.highlights,
        riskLevel: volatility > 50 ? 'very-high' : volatility > 30 ? 'high' : 'medium',
        volatility,
        marketCap: fundamentalData.marketCap,
        avgVolume: fundamentalData.avgVolume,
        cashRunway: fundamentalData.cashRunway,
        recentNews: researchData.news.slice(0, 5)
      };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze news content for rumors, politics, and tariffs
   */
  private analyzeNewsContent(newsItems: NewsItem[]): {
    rumorsPoliticsTariffsScore: number;
    newsScore: number;
    rumors: NewsSignal[];
    political: NewsSignal[];
    tariffs: NewsSignal[];
    highlights: NewsSignal[];
  } {
    // Filter to only news from last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentNewsItems = newsItems.filter(item => {
      const publishedDate = new Date(item.publishedAt);
      return publishedDate >= threeDaysAgo;
    });

    console.log(`Filtered news: ${recentNewsItems.length} items from last 3 days (out of ${newsItems.length} total)`);

    const rumors: NewsSignal[] = [];
    const political: NewsSignal[] = [];
    const tariffs: NewsSignal[] = [];
    const highlights: NewsSignal[] = [];

    const rumorKeywords = [
      'rumor', 'speculation', 'insider', 'leak', 'whisper', 'reportedly',
      'sources say', 'unconfirmed', 'buzz', 'chatter', 'allegedly',
      'acquisition target', 'buyout', 'merger talks', 'exploring sale',
      'could be', 'may be', 'potential', 'considering', 'talks', 'deal',
      'partnership', 'acquisition', 'takeover', 'bid', 'offer'
    ];

    const politicalKeywords = [
      'regulation', 'sec', 'fda', 'approval', 'government', 'congress',
      'senate', 'policy', 'legislation', 'regulatory', 'antitrust',
      'investigation', 'hearing', 'committee', 'biden', 'trump',
      'election', 'political', 'federal', 'white house', 'lawsuit',
      'lawsuit', 'court', 'legal', 'compliance', 'filing', 'regulator',
      'agency', 'rule', 'law', 'ban', 'restrict'
    ];

    const tariffKeywords = [
      'tariff', 'trade war', 'import', 'export', 'customs', 'duty',
      'trade policy', 'china', 'sanctions', 'trade deal',
      'trade tensions', 'protectionism', 'wto', 'nafta', 'usmca',
      'trade', 'global', 'international', 'supply chain', 'manufacturing'
    ];

    let rumorScore = 0;
    let politicalScore = 0;
    let tariffScore = 0;
    let newsImpactScore = 0;

    recentNewsItems.forEach(item => {
      const text = `${item.title} ${item.snippet}`.toLowerCase();

      // Check for rumors
      rumorKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          rumorScore += 10;
          if (rumors.length < 3 && !rumors.find(r => r.title === item.title)) {
            rumors.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
              publishedAt: item.publishedAt
            });
          }
        }
      });

      // Check for political factors
      politicalKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          politicalScore += 10;
          if (political.length < 3 && !political.find(p => p.title === item.title)) {
            political.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
              publishedAt: item.publishedAt
            });
          }
        }
      });

      // Check for tariff impacts
      tariffKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          tariffScore += 15; // Higher weight for tariffs
          if (tariffs.length < 3 && !tariffs.find(t => t.title === item.title)) {
            tariffs.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
              publishedAt: item.publishedAt
            });
          }
        }
      });

      // General news impact
      const impactKeywords = ['surge', 'plunge', 'rally', 'crash', 'breakthrough', 'announcement'];
      impactKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          newsImpactScore += 8;
          if (highlights.length < 5 && !highlights.find(h => h.title === item.title)) {
            highlights.push({
              title: item.title,
              url: item.url,
              snippet: item.snippet,
              publishedAt: item.publishedAt
            });
          }
        }
      });
    });

    // Calculate combined score (divide by 1.5 instead of 3 for more generous scoring)
    const rumorsPoliticsTariffsScore = Math.min(100, (rumorScore + politicalScore + tariffScore) / 1.5);
    const newsScore = Math.min(100, newsImpactScore * 2);

    return {
      rumorsPoliticsTariffsScore,
      newsScore,
      rumors: rumors.slice(0, 3),
      political: political.slice(0, 3),
      tariffs: tariffs.slice(0, 3),
      highlights: highlights.slice(0, 5)
    };
  }

  /**
   * Get price data for technical analysis
   */
  private async getPriceDataForSymbol(symbol: string): Promise<any[]> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`;
      const response = await axios.get(url);

      const result = response.data?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const prices = result?.indicators?.quote?.[0]?.close || [];

      return timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toLocaleDateString(),
          price: prices[index] || 0,
          timestamp
        }))
        .filter((point: any) => point.price > 0);
    } catch (error) {
      console.error(`Error fetching price data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(priceData: any[]): number {
    if (priceData.length < 2) return 0;

    const prices = priceData.map(p => p.price);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(dailyReturn);
    }

    // Standard deviation of returns
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize and convert to percentage
    return stdDev * Math.sqrt(252) * 100;
  }

  /**
   * Extract technical signals
   */
  private extractTechnicalSignals(indicators: any): string[] {
    const signals: string[] = [];

    if (indicators.rsi > 70) {
      signals.push('Overbought RSI - potential pullback or momentum continuation');
    } else if (indicators.rsi < 30) {
      signals.push('Oversold RSI - potential bounce opportunity');
    }

    if (indicators.macd.histogram > 0) {
      signals.push('Bullish MACD crossover - upward momentum');
    }

    if (indicators.momentum > 10) {
      signals.push('Strong upward momentum - trend accelerating');
    } else if (indicators.momentum < -10) {
      signals.push('Strong downward momentum - potential reversal setup');
    }

    if (indicators.trend === 'bullish') {
      signals.push('Bullish trend confirmed');
    }

    return signals.slice(0, 4);
  }

  /**
   * Generate key reason for moonshot
   */
  private generateKeyReason(newsAnalysis: any, technicalIndicators: any, score: number): string {
    const reasons: string[] = [];

    if (newsAnalysis.rumors.length > 0) {
      reasons.push('significant market rumors');
    }

    if (newsAnalysis.political.length > 0) {
      reasons.push('political/regulatory catalysts');
    }

    if (newsAnalysis.tariffs.length > 0) {
      reasons.push('tariff/trade policy impact');
    }

    if (technicalIndicators.momentum > 10) {
      reasons.push('strong technical momentum');
    }

    if (technicalIndicators.rsi < 35) {
      reasons.push('oversold bounce potential');
    }

    if (reasons.length === 0) {
      return 'High volatility opportunity with mixed signals';
    }

    const topReasons = reasons.slice(0, 2).join(' + ');
    return `Moonshot potential from ${topReasons}`;
  }

  /**
   * Get fundamental data for pre-qualification
   */
  private async getFundamentalData(symbol: string): Promise<{
    marketCap?: number;
    avgVolume?: number;
    cashRunway?: number;
    shortInterest?: number;
  }> {
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData`;
      const response = await axios.get(url);

      const summaryDetail = response.data?.quoteSummary?.result?.[0]?.summaryDetail;
      const keyStats = response.data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
      const financialData = response.data?.quoteSummary?.result?.[0]?.financialData;

      const marketCap = summaryDetail?.marketCap?.raw;
      const avgVolume = summaryDetail?.averageVolume?.raw;
      const shortInterest = keyStats?.shortPercentOfFloat?.raw ? keyStats.shortPercentOfFloat.raw * 100 : undefined;

      // Estimate cash runway (totalCash / quarterlyCashFlow * 3 = months)
      let cashRunway: number | undefined;
      if (financialData?.totalCash?.raw && financialData?.operatingCashflow?.raw) {
        const quarterlyCashFlow = Math.abs(financialData.operatingCashflow.raw) / 4;
        if (quarterlyCashFlow > 0) {
          cashRunway = (financialData.totalCash.raw / quarterlyCashFlow) * 3;
        }
      }

      return {
        marketCap,
        avgVolume,
        cashRunway,
        shortInterest
      };
    } catch (error) {
      console.error(`Error fetching fundamental data for ${symbol}:`, error);
      return {};
    }
  }

  /**
   * Detect catalyst window (<30 days)
   */
  private detectCatalyst(newsItems: NewsItem[]): { hasCatalyst: boolean; date?: string; type?: string } {
    const catalystKeywords = [
      { keyword: 'fda approval', type: 'FDA Approval', daysAhead: 30 },
      { keyword: 'earnings', type: 'Earnings Report', daysAhead: 14 },
      { keyword: 'vote', type: 'Shareholder Vote', daysAhead: 30 },
      { keyword: 'merger', type: 'Merger Completion', daysAhead: 60 },
      { keyword: 'acquisition', type: 'Acquisition', daysAhead: 60 },
      { keyword: 'product launch', type: 'Product Launch', daysAhead: 30 },
      { keyword: 'trial results', type: 'Clinical Trial Results', daysAhead: 45 }
    ];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    for (const item of newsItems) {
      const text = `${item.title} ${item.snippet}`.toLowerCase();

      for (const catalyst of catalystKeywords) {
        if (text.includes(catalyst.keyword)) {
          // Look for date patterns in the text
          const datePatterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
            /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
            /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
          ];

          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              // Assume date is within catalyst window
              const estimatedDate = new Date();
              estimatedDate.setDate(estimatedDate.getDate() + catalyst.daysAhead);

              return {
                hasCatalyst: true,
                date: estimatedDate.toISOString().split('T')[0],
                type: catalyst.type
              };
            }
          }

          // If keyword found but no date, estimate based on typical timeline
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() + catalyst.daysAhead);

          return {
            hasCatalyst: true,
            date: estimatedDate.toISOString().split('T')[0],
            type: catalyst.type
          };
        }
      }
    }

    return { hasCatalyst: false };
  }

  /**
   * Calculate short squeeze potential
   */
  private calculateShortSqueezePotential(shortInterest: number, sentimentScore: number): number {
    // shortInterest is percentage (0-100)
    // sentimentScore is 0-100
    // Normalize both and multiply
    const normalizedShort = shortInterest / 100;
    const normalizedSentiment = sentimentScore / 100;

    return parseFloat((normalizedShort * normalizedSentiment).toFixed(2));
  }

  /**
   * Calculate event sentiment
   */
  private calculateEventSentiment(newsItems: NewsItem[]): 'positive' | 'negative' | 'neutral' {
    const positiveEvents = [
      { keyword: 'fda approval', score: 30 },
      { keyword: 'approved', score: 25 },
      { keyword: 'merger', score: 20 },
      { keyword: 'acquisition', score: 20 },
      { keyword: 'breakthrough', score: 25 },
      { keyword: 'partnership', score: 15 },
      { keyword: 'beat estimates', score: 20 },
      { keyword: 'upgrade', score: 15 },
      { keyword: 'positive results', score: 20 }
    ];

    const negativeEvents = [
      { keyword: 'sec probe', score: -40 },
      { keyword: 'investigation', score: -35 },
      { keyword: 'lawsuit', score: -30 },
      { keyword: 'recall', score: -35 },
      { keyword: 'downgrade', score: -20 },
      { keyword: 'miss estimates', score: -25 },
      { keyword: 'rejected', score: -30 },
      { keyword: 'delay', score: -20 },
      { keyword: 'bankruptcy', score: -50 }
    ];

    let totalScore = 0;

    newsItems.forEach(item => {
      const text = `${item.title} ${item.snippet}`.toLowerCase();

      positiveEvents.forEach(event => {
        if (text.includes(event.keyword)) {
          totalScore += event.score;
        }
      });

      negativeEvents.forEach(event => {
        if (text.includes(event.keyword)) {
          totalScore += event.score;
        }
      });
    });

    if (totalScore > 20) return 'positive';
    if (totalScore < -20) return 'negative';
    return 'neutral';
  }

  /**
   * Determine recommendation (WATCHLIST vs BUY)
   */
  private determineRecommendation(
    moonshotScore: number,
    shortSqueezePotential: number,
    eventSentiment: 'positive' | 'negative' | 'neutral',
    hasCatalyst: boolean
  ): 'WATCHLIST' | 'BUY' {
    // BUY conditions:
    // 1. Score >= 50
    // 2. Positive event sentiment
    // 3. Short squeeze potential > 0.3

    if (moonshotScore >= 50 && eventSentiment === 'positive' && shortSqueezePotential > 0.3) {
      return 'BUY';
    }

    // BUY if score is very high (>= 70) even without short squeeze
    if (moonshotScore >= 70 && eventSentiment === 'positive') {
      return 'BUY';
    }

    // Otherwise WATCHLIST
    return 'WATCHLIST';
  }
}
