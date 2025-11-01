import axios from 'axios';
import { TechnicalAnalysisService } from './technicalAnalysisService.js';
import { StockResearchService } from './stockResearchService.js';
import { MoonshotScoringService } from './moonshotScoringService.js';

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
  tier: 'A' | 'B'; // A = Actionable, B = Watch

  // Momentum indicators
  unusualVolume: boolean;
  volumeRatio?: number; // current volume / avg volume
  dayOverDayChange?: number; // % price change from previous day

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
  private serpApiKey: string;
  private technicalService: TechnicalAnalysisService;
  private researchService: StockResearchService;
  private moonshotScoringService: MoonshotScoringService;

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
    this.serpApiKey = process.env.SERPAPI_KEY || '';
    this.technicalService = new TechnicalAnalysisService();
    this.researchService = new StockResearchService();
    this.moonshotScoringService = new MoonshotScoringService();
  }

  /**
   * Find top moonshot candidates - Revised Pipeline
   */
  async findMoonshotCandidates(limit: number = 10): Promise<MoonshotCandidate[]> {
    console.log('🔍 MOONSHOT PIPELINE - Starting candidate search...');

    const candidates: MoonshotCandidate[] = [];

    // STEP 1: Build candidate list from 3 sources
    console.log('\n📋 STEP 1: Building candidate list...');
    const candidateList = await this.buildCandidateList();
    console.log(`   Found ${candidateList.length} candidates to analyze:`, candidateList.slice(0, 15));

    // STEP 2-5: Analyze each stock (includes filters, scoring, gates, and tier classification)
    for (const stockSymbol of candidateList.slice(0, 12)) { // Analyze top 12 to reduce timeout risk
      try {
        console.log(`\n📊 Analyzing ${stockSymbol}...`);
        const candidate = await this.analyzeStockForMoonshot(stockSymbol);
        if (candidate) {
          console.log(`   ✅ ${stockSymbol} qualified as Tier ${candidate.tier} with score ${candidate.moonshotScore.toFixed(1)}`);
          candidates.push(candidate);

          // Stop if we have enough candidates (5 Tier A or 10 total)
          const tierA = candidates.filter(c => c.tier === 'A').length;
          if (tierA >= 5 || candidates.length >= 10) {
            console.log(`   ⏩ Early stop: Found ${tierA} Tier A and ${candidates.length} total candidates`);
            break;
          }
        } else {
          console.log(`   ❌ ${stockSymbol} did not qualify`);
        }
      } catch (error) {
        console.error(`   ⚠️  Error analyzing ${stockSymbol}:`, error);
      }
    }

    console.log(`\n📈 Total candidates found: ${candidates.length}`);

    // STEP 6: Sort output - Tier A first, then Tier B
    candidates.sort((a, b) => {
      // First sort by tier (A before B)
      if (a.tier !== b.tier) {
        return a.tier === 'A' ? -1 : 1;
      }
      // Within same tier, sort by score
      return b.moonshotScore - a.moonshotScore;
    });

    console.log(`\n🎯 Final results: ${candidates.filter(c => c.tier === 'A').length} Tier A, ${candidates.filter(c => c.tier === 'B').length} Tier B`);

    return candidates.slice(0, limit);
  }

  /**
   * STEP 1: Build candidate list from 3 sources
   */
  private async buildCandidateList(): Promise<string[]> {
    const discoveredStocks = new Set<string>();

    // Source 1: Brave news tickers
    console.log('   Source 1: Brave news search...');
    const newsStocks = await this.searchHighImpactStocks();
    newsStocks.forEach(s => discoveredStocks.add(s));
    console.log(`   - Found ${newsStocks.length} from news`);

    // Source 2: Watchlist
    console.log('   Source 2: Watchlist...');
    this.WATCHLIST.forEach(s => discoveredStocks.add(s));
    console.log(`   - Added ${this.WATCHLIST.length} from watchlist`);

    // Source 3: Top % movers (>|8%|) + unusual volume
    console.log('   Source 3: Top movers & volume spikes...');
    const movers = await this.getTopMoversAndVolumeSpikes();
    movers.forEach(s => discoveredStocks.add(s));
    console.log(`   - Found ${movers.length} movers/volume spikes`);

    return Array.from(discoveredStocks);
  }

  /**
   * Get top % movers (>|8%|) and unusual volume stocks from watchlist
   */
  private async getTopMoversAndVolumeSpikes(): Promise<string[]> {
    const moversAndSpikes: string[] = [];

    // Check watchlist stocks for big moves and volume spikes
    for (const symbol of this.WATCHLIST.slice(0, 30)) { // Check first 30 from watchlist
      try {
        const priceData = await this.getPriceDataForSymbol(symbol);
        if (priceData.length < 2) continue;

        const dayChange = this.calculateDayOverDayChange(priceData);

        if (dayChange && Math.abs(dayChange) > 8) {
          moversAndSpikes.push(symbol);
          console.log(`      ${symbol}: ${dayChange > 0 ? '+' : ''}${dayChange.toFixed(1)}% (big move)`);
        }
      } catch (error) {
        // Silently skip errors for individual stocks
      }
    }

    return moversAndSpikes;
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
   * Search for stocks by query (Brave Search with SerpAPI fallback)
   */
  private async searchStocksByQuery(query: string): Promise<string[]> {
    // Try Brave Search first
    if (this.braveApiKey) {
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
          },
          timeout: 8000
        });

        const results = response.data?.web?.results || [];
        if (results.length > 0) {
          console.log(`   Brave Search: Found ${results.length} results for "${query}"`);
          return this.extractTickersFromResults(results);
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.log(`   Brave Search rate limited, trying SerpAPI fallback...`);
        } else {
          console.error('Brave search error:', error.message);
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
            num: 10
          },
          timeout: 8000
        });

        const results = response.data?.news_results || [];
        if (results.length > 0) {
          console.log(`   SerpAPI: Found ${results.length} results for "${query}"`);
          return this.extractTickersFromResults(results);
        }
      } catch (error: any) {
        console.error('SerpAPI error:', error.message);
      }
    }

    console.warn(`   No search results for "${query}" - using watchlist only`);
    return [];
  }

  /**
   * Extract stock tickers from search results
   */
  private extractTickersFromResults(results: any[]): string[] {
    const stockSymbols = new Set<string>();

    results.forEach((result: any) => {
      const text = `${result.title || ''} ${result.description || result.snippet || ''}`.toUpperCase();

      // Look for stock ticker patterns (uppercase 2-5 letters)
      const tickerMatches = text.match(/\b[A-Z]{2,5}\b/g) || [];

      tickerMatches.forEach((ticker: string) => {
        // Filter out common words
        if (!['NYSE', 'NASDAQ', 'USD', 'EUR', 'GBP', 'CEO', 'CFO', 'IPO', 'ETF', 'NEWS'].includes(ticker)) {
          if (this.WATCHLIST.includes(ticker)) {
            stockSymbols.add(ticker);
          }
        }
      });
    });

    return Array.from(stockSymbols);
  }

  /**
   * STEP 2: Pre-qualification filter (relaxed liquidity)
   */
  private async passesPreQualification(
    symbol: string,
    currentPrice: number,
    marketCap?: number,
    avgVolume?: number,
    cashRunway?: number
  ): Promise<boolean> {
    // Price ≥ $1
    if (currentPrice < 1) {
      console.log(`   ${symbol} failed: Price $${currentPrice.toFixed(2)} < $1.00`);
      return false;
    }

    // Market Cap ≥ $100M
    if (marketCap && marketCap < 100_000_000) {
      console.log(`   ${symbol} failed: Market cap $${(marketCap / 1_000_000).toFixed(0)}M < $100M`);
      return false;
    }

    // Liquidity: avg vol ≥ 100k shares/day
    if (avgVolume && avgVolume < 100_000) {
      console.log(`   ${symbol} failed: Avg volume ${(avgVolume / 1000).toFixed(0)}k < 100k`);
      return false;
    }

    // Cash Runway ≥ 3 months (only fail if critically low)
    if (cashRunway !== undefined && cashRunway < 3) {
      console.log(`   ${symbol} failed: Cash runway ${cashRunway} months < 3 months`);
      return false;
    }

    return true;
  }

  /**
   * Analyze a stock for moonshot potential using professional APIs
   */
  private async analyzeStockForMoonshot(symbol: string): Promise<MoonshotCandidate | null> {
    try {
      // Get research data (includes professional APIs: Quiver, Alpha Vantage, Marketaux)
      const researchData = await this.researchService.researchStock(symbol);

      if (!researchData.news || researchData.news.length === 0) {
        console.log(`   No news data for ${symbol}`);
        return null;
      }

      console.log(`   Found ${researchData.news.length} news items for ${symbol}`);

      // Get fundamental data for pre-qualification
      const priceData = await this.getPriceDataForSymbol(symbol);
      const fundamentalData = await this.getFundamentalData(symbol);

      // STEP 2: Pre-qualification filter
      const passesFilter = await this.passesPreQualification(
        symbol,
        researchData.currentPrice,
        fundamentalData.marketCap,
        fundamentalData.avgVolume,
        fundamentalData.cashRunway
      );

      if (!passesFilter) {
        console.log(`   ${symbol} did not pass pre-qualification filters`);
        return null;
      }

      // STEP 3: Calculate professional moonshot score using new scoring service
      const moonshotBreakdown = this.moonshotScoringService.calculateMoonshotScore(researchData);

      // Extract scores from professional analysis
      const moonshotScore = moonshotBreakdown.totalScore;
      const rumorsPoliticsTariffsScore = moonshotBreakdown.components.rumorsAndPolitics.score;
      const newsScore = moonshotBreakdown.components.newsImpact.score;

      console.log(`   Professional Moonshot Score for ${symbol}:
   - Total: ${moonshotScore} (Grade: ${moonshotBreakdown.grade})
   - Rumors/Politics/Tariffs: ${rumorsPoliticsTariffsScore}/50
   - News Impact: ${newsScore}/25
   - Social Sentiment: ${moonshotBreakdown.components.socialSentiment.score}/15
   - Insider Activity: ${moonshotBreakdown.components.insiderActivity.score}/10`);

      // STEP 4: Only accept stocks with moonshot scores >= 30 (Grade D or higher)
      // This ensures we don't show AVOID/F grade stocks as moonshot candidates
      if (moonshotScore < 30) {
        console.log(`   ${symbol} failed: Moonshot score ${moonshotScore} < 30 (Grade ${moonshotBreakdown.grade})`);
        return null;
      }

      // Get technical analysis for additional signals
      const technicalIndicators = this.technicalService.analyzeTechnical(priceData);
      const technicalScore = this.technicalService.calculateTechnicalScore(technicalIndicators, researchData.currentPrice);

      // Analyze news content for display purposes
      const newsAnalysis = this.analyzeNewsContent(researchData.news);
      const catalyst = this.detectCatalyst(researchData.news);
      const eventSentiment = this.calculateEventSentiment(researchData.news);

      // Calculate volume and momentum indicators
      const volumeRatio = fundamentalData.currentVolume && fundamentalData.avgVolume
        ? fundamentalData.currentVolume / fundamentalData.avgVolume
        : undefined;
      const unusualVolume = volumeRatio ? volumeRatio > 2.0 : false;
      const dayOverDayChange = this.calculateDayOverDayChange(priceData);

      // Calculate short squeeze potential
      const shortSqueezePotential = this.calculateShortSqueezePotential(
        fundamentalData.shortInterest || 0,
        newsScore
      );

      // Classify into tiers based on professional score
      const tier = this.classifyTierByProfessionalScore(
        moonshotScore,
        moonshotBreakdown.grade,
        unusualVolume,
        dayOverDayChange
      );

      if (!tier) {
        console.log(`   Did not qualify for any tier`);
        return null;
      }

      console.log(`   Qualified as Tier ${tier} with Grade ${moonshotBreakdown.grade}`);

      // Calculate volatility
      const volatility = this.calculateVolatility(priceData);

      // Generate key reason from professional analysis
      const keyReason = this.generateKeyReasonFromProfessionalScore(moonshotBreakdown);

      // Determine recommendation based on grade
      const recommendation = this.determineRecommendationFromGrade(
        moonshotBreakdown.grade,
        moonshotScore,
        eventSentiment
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
        tier,
        unusualVolume,
        volumeRatio,
        dayOverDayChange,
        keyReason,
        rumorSignals: newsAnalysis.rumors,
        politicalFactors: newsAnalysis.political,
        tariffImpacts: newsAnalysis.tariffs,
        technicalSignals: this.extractTechnicalSignals(technicalIndicators),
        newsHighlights: newsAnalysis.highlights,
        riskLevel: moonshotBreakdown.riskLevel === 'Very High' ? 'very-high' :
                   moonshotBreakdown.riskLevel === 'High' ? 'high' : 'medium',
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
      'partnership', 'acquisition', 'takeover', 'bid', 'offer',
      // M&A synonym cluster
      'strategic alternatives', 'exploring options', 'go-private', 'go private',
      'approached', 'unsolicited offer', 'hostile takeover', 'friendly deal'
    ];

    const politicalKeywords = [
      'regulation', 'sec', 'fda', 'approval', 'government', 'congress',
      'senate', 'policy', 'legislation', 'regulatory', 'antitrust',
      'investigation', 'hearing', 'committee', 'biden', 'trump',
      'election', 'political', 'federal', 'white house', 'lawsuit',
      'lawsuit', 'court', 'legal', 'compliance', 'filing', 'regulator',
      'agency', 'rule', 'law', 'ban', 'restrict',
      // FDA synonym cluster
      'phase 2 data', 'phase 3 data', 'phase 2/3', 'phase ii', 'phase iii',
      'endpoint met', 'primary endpoint', 'no safety signal', 'safety signal',
      'advisory committee', 'adcom', 'pdufa date', 'clinical trial results'
    ];

    const tariffKeywords = [
      'tariff', 'trade war', 'import', 'export', 'customs', 'duty',
      'trade policy', 'china', 'sanctions', 'trade deal',
      'trade tensions', 'protectionism', 'wto', 'nafta', 'usmca',
      'trade', 'global', 'international', 'supply chain', 'manufacturing',
      // Tariff synonym cluster
      'export controls', 'export restriction', 'itc ruling', 'itc investigation',
      'commerce department', 'section 301', 'antidumping', 'countervailing',
      'trade remedy', 'entity list', 'denied parties'
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
    currentVolume?: number;
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
      const currentVolume = summaryDetail?.volume?.raw;
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
        currentVolume,
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

  /**
   * STEP 5: Classify stock into Tier A or Tier B based on professional moonshot score
   */
  private classifyTierByProfessionalScore(
    moonshotScore: number,
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
    unusualVolume: boolean,
    dayOverDayChange?: number
  ): 'A' | 'B' | null {
    // Tier A: Grade A or S (score >= 70)
    // These are strong moonshot candidates with high confidence
    if (grade === 'S' || grade === 'A') {
      return 'A';
    }

    // Tier A: Grade B (score 55-69) with strong momentum
    if (grade === 'B') {
      const hasBigMove = dayOverDayChange !== undefined && Math.abs(dayOverDayChange) > 5;
      if (unusualVolume || hasBigMove) {
        return 'A';
      }
      return 'B'; // Grade B without momentum goes to Tier B
    }

    // Tier B: Grade C or D (score 30-54) with strong momentum
    if (grade === 'C' || grade === 'D') {
      const hasBigMove = dayOverDayChange !== undefined && Math.abs(dayOverDayChange) > 5;
      if (unusualVolume || hasBigMove) {
        return 'B';
      }
    }

    // Doesn't qualify for any tier (F grades are filtered out earlier)
    return null;
  }

  /**
   * Generate key reason from professional moonshot analysis
   */
  private generateKeyReasonFromProfessionalScore(moonshotBreakdown: any): string {
    const strengths = moonshotBreakdown.strengths;

    if (strengths.length === 0) {
      return 'High-risk speculative opportunity with mixed signals';
    }

    // Take top 2 strengths
    const topReasons = strengths.slice(0, 2).join(' + ');
    return `Moonshot potential: ${topReasons}`;
  }

  /**
   * Determine recommendation based on professional grade
   */
  private determineRecommendationFromGrade(
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
    moonshotScore: number,
    eventSentiment: 'positive' | 'negative' | 'neutral'
  ): 'WATCHLIST' | 'BUY' {
    // BUY for Grade S or A (score >= 70) with positive sentiment
    if ((grade === 'S' || grade === 'A') && eventSentiment === 'positive') {
      return 'BUY';
    }

    // BUY for exceptional scores (>= 80) even with neutral sentiment
    if (moonshotScore >= 80) {
      return 'BUY';
    }

    // Otherwise WATCHLIST (monitor the opportunity)
    return 'WATCHLIST';
  }

  /**
   * Calculate day-over-day price change percentage
   */
  private calculateDayOverDayChange(priceData: any[]): number | undefined {
    if (priceData.length < 2) return undefined;

    const currentPrice = priceData[priceData.length - 1].price;
    const previousPrice = priceData[priceData.length - 2].price;

    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }
}
