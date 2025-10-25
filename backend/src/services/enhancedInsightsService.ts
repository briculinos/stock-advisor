import { ElliottWaveService } from './elliottWaveService.js';
import { MacroAnalysisService } from './macroAnalysisService.js';
import { TechnicalAnalysisService } from './technicalAnalysisService.js';
import { SentimentAnalysisService } from './sentimentAnalysisService.js';
import { StockResearchService } from './stockResearchService.js';
import { FusionEngine } from './fusionEngine.js';

interface EnhancedInsight {
  symbol: string;
  currentPrice: number;
  currency: string;

  // Main recommendation
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  compositeScore: number;

  // Price targets
  entry: number;
  stop: number;
  target1: number;
  target2: number;

  // Analysis breakdown
  technical: {
    score: number;
    rsi: number;
    macd: any;
    momentum: number;
    trend: string;
    supportResistance?: any;
    explanation: string;
  };
  fundamental: {
    score: number;
    currentWave: string;
    elliottRecommendation: string;
    explanation: string;
  };
  sentiment: {
    score: number;
    polarity: string;
    hypeLevel: string;
    keyTopics: string[];
    explanation: string;
  };
  macro: {
    score: number;
    regime: string;
    vixLevel: number;
    explanation: string;
  };

  // Additional data
  rationale: string;
  priceData: any[];
  waves: any[];
  fibonacciLevels: any[];
  news: any[];
}

export class EnhancedInsightsService {
  private elliottWaveService: ElliottWaveService;
  private macroService: MacroAnalysisService;
  private technicalService: TechnicalAnalysisService;
  private sentimentService: SentimentAnalysisService;
  private researchService: StockResearchService;
  private fusionEngine: FusionEngine;

  constructor() {
    this.elliottWaveService = new ElliottWaveService();
    this.macroService = new MacroAnalysisService();
    this.technicalService = new TechnicalAnalysisService();
    this.sentimentService = new SentimentAnalysisService();
    this.researchService = new StockResearchService();
    this.fusionEngine = new FusionEngine();
  }

  /**
   * Generate comprehensive enhanced insights
   */
  async generateInsights(symbol: string, companyName: string = ''): Promise<EnhancedInsight> {
    console.log(`Generating enhanced insights for ${symbol}...`);

    // 1. Get stock research data first (news, etc.)
    const researchData = await this.researchService.researchStock(symbol);

    // 2. Analyze macro conditions (needed for Elliott Wave)
    const macroIndicators = await this.macroService.analyzeMacroConditions();
    const macroScore = this.macroService.calculateMacroScore(macroIndicators);

    // 3. Analyze sentiment (needed for Elliott Wave)
    const sentimentAnalysis = await this.sentimentService.analyzeSentiment(
      symbol,
      companyName || symbol,
      researchData.news
    );
    const sentimentScore = this.sentimentService.calculateSentimentScore(sentimentAnalysis);

    // 4. Collect market data with Elliott Wave analysis (now with sentiment & macro)
    const elliottAnalysis = await this.elliottWaveService.analyzeElliottWave(
      symbol,
      sentimentScore,
      macroScore
    );

    // 5. Analyze technical indicators
    const technicalIndicators = this.technicalService.analyzeTechnical(elliottAnalysis.priceData);
    const currentPrice = elliottAnalysis.priceData[elliottAnalysis.priceData.length - 1]?.price || researchData.currentPrice;
    const technicalScore = this.technicalService.calculateTechnicalScore(technicalIndicators, currentPrice);

    // 6. Calculate fundamental score (based on Elliott Wave analysis)
    // For now, we'll derive this from Elliott Wave patterns
    const fundamentalScore = this.calculateFundamentalScore(elliottAnalysis);

    // 7. Extract critical risks from news/sentiment
    const criticalRisks: string[] = [];
    researchData.news.forEach(newsItem => {
      const text = `${newsItem.title} ${newsItem.snippet}`.toLowerCase();
      const riskKeywords = ['fraud', 'investigation', 'lawsuit', 'sec', 'probe', 'bankruptcy', 'recall', 'delisting'];
      if (riskKeywords.some(kw => text.includes(kw))) {
        criticalRisks.push(newsItem.title);
      }
    });

    // 8. Fuse all data sources with adaptive weighting
    const fusionResult = this.fusionEngine.fuse({
      technicalScore,
      fundamentalScore,
      sentimentScore,
      macroScore,
      currentPrice: researchData.currentPrice,
      symbol,
      industry: researchData.industry,
      vixLevel: macroIndicators.vixLevel,
      criticalRisks,
      atr: elliottAnalysis.atr, // Pass ATR from Elliott Wave analysis
      technicalConfidence: technicalIndicators.confidence || 75,
      fundamentalConfidence: elliottAnalysis.confidence || 75,
      sentimentConfidence: sentimentAnalysis.confidence || 75,
      macroConfidence: macroIndicators.confidence || 75
    });

    // 9. Build comprehensive insight
    const enhancedInsight: EnhancedInsight = {
      symbol,
      currentPrice: researchData.currentPrice,
      currency: researchData.currency,

      recommendation: fusionResult.recommendation,
      confidence: fusionResult.confidence,
      compositeScore: fusionResult.compositeScore,

      entry: fusionResult.entry,
      stop: fusionResult.stop,
      target1: fusionResult.target1,
      target2: fusionResult.target2,

      technical: {
        score: technicalScore,
        rsi: technicalIndicators.rsi,
        macd: technicalIndicators.macd,
        momentum: technicalIndicators.momentum,
        trend: technicalIndicators.trend,
        supportResistance: technicalIndicators.supportResistance,
        explanation: this.generateTechnicalExplanation(technicalIndicators, technicalScore, currentPrice)
      },

      fundamental: {
        score: fundamentalScore,
        currentWave: elliottAnalysis.currentWave,
        elliottRecommendation: elliottAnalysis.recommendation,
        explanation: this.generateFundamentalExplanation(elliottAnalysis, fundamentalScore)
      },

      sentiment: {
        score: sentimentScore,
        polarity: sentimentAnalysis.polarity,
        hypeLevel: sentimentAnalysis.hypeLevel,
        keyTopics: sentimentAnalysis.keyTopics,
        explanation: this.generateSentimentExplanation(sentimentAnalysis, sentimentScore)
      },

      macro: {
        score: macroScore,
        regime: macroIndicators.regime,
        vixLevel: macroIndicators.vixLevel,
        explanation: this.generateMacroExplanation(macroIndicators, macroScore)
      },

      rationale: fusionResult.rationale,
      priceData: elliottAnalysis.priceData,
      waves: elliottAnalysis.waves,
      fibonacciLevels: elliottAnalysis.fibonacciLevels,
      news: researchData.news
    };

    console.log(`Enhanced insights generated: ${fusionResult.recommendation} with ${fusionResult.confidence}% confidence`);

    return enhancedInsight;
  }

  /**
   * Calculate fundamental score from Elliott Wave analysis
   */
  private calculateFundamentalScore(elliottAnalysis: any): number {
    let score = 50; // Start neutral

    // Score based on Elliott Wave recommendation
    if (elliottAnalysis.recommendation === 'BUY') {
      score += 30;
    } else if (elliottAnalysis.recommendation === 'SELL') {
      score -= 30;
    }

    // Score based on wave position
    const wave = elliottAnalysis.currentWave;
    if (['1', '3'].includes(wave)) {
      score += 15; // Early bullish waves
    } else if (wave === '5') {
      score -= 10; // Late wave, caution
    } else if (wave === 'C') {
      score += 10; // Correction ending
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate technical analysis explanation
   */
  private generateTechnicalExplanation(indicators: any, score: number, currentPrice: number): string {
    const parts: string[] = [];

    // RSI interpretation
    if (indicators.rsi > 70) {
      parts.push(`RSI at ${indicators.rsi.toFixed(1)} indicates overbought conditions, suggesting potential pullback.`);
    } else if (indicators.rsi < 30) {
      parts.push(`RSI at ${indicators.rsi.toFixed(1)} shows oversold levels, indicating potential bounce opportunity.`);
    } else if (indicators.rsi >= 50 && indicators.rsi <= 60) {
      parts.push(`RSI at ${indicators.rsi.toFixed(1)} reflects healthy bullish momentum without extreme readings.`);
    } else {
      parts.push(`RSI at ${indicators.rsi.toFixed(1)} is in neutral territory.`);
    }

    // MACD interpretation
    if (indicators.macd.histogram > 0) {
      parts.push(`MACD histogram is positive, confirming upward price momentum.`);
    } else {
      parts.push(`MACD histogram is negative, indicating downward pressure.`);
    }

    // Support/Resistance interpretation
    if (indicators.supportResistance && currentPrice) {
      const { support, resistance } = indicators.supportResistance;

      // Check if near support
      const nearestSupport = support.find((s: number) => {
        const diff = Math.abs(currentPrice - s) / currentPrice;
        return diff < 0.03;
      });

      // Check if near resistance
      const nearestResistance = resistance.find((r: number) => {
        const diff = Math.abs(currentPrice - r) / currentPrice;
        return diff < 0.03;
      });

      // Check for breakouts/breakdowns
      const brokeResistance = resistance.find((r: number) => currentPrice > r && (currentPrice - r) / r < 0.05);
      const brokeSupport = support.find((s: number) => currentPrice < s && (s - currentPrice) / s < 0.05);

      if (brokeResistance) {
        parts.push(`Price recently broke above resistance at ${brokeResistance.toFixed(2)}, signaling a bullish breakout opportunity.`);
      } else if (brokeSupport) {
        parts.push(`Price fell below support at ${brokeSupport.toFixed(2)}, indicating potential continued weakness.`);
      } else if (nearestSupport) {
        parts.push(`Price is near strong support at ${nearestSupport.toFixed(2)}, offering a potential entry point with limited downside.`);
      } else if (nearestResistance) {
        parts.push(`Price is approaching resistance at ${nearestResistance.toFixed(2)}, which could cap upside in the near term.`);
      }
    }

    // Trend summary
    parts.push(`Overall trend is ${indicators.trend}, supporting a ${score >= 60 ? 'bullish' : score <= 40 ? 'bearish' : 'neutral'} technical outlook.`);

    return parts.join(' ');
  }

  /**
   * Generate fundamental analysis explanation
   */
  private generateFundamentalExplanation(elliottAnalysis: any, score: number): string {
    const wave = elliottAnalysis.currentWave;
    const parts: string[] = [];

    // Wave position interpretation
    if (['1', '3'].includes(wave)) {
      parts.push(`Currently in Elliott Wave ${wave}, an impulse wave indicating strong directional movement.`);
      parts.push(`This early-stage wave position suggests momentum is building with potential for further gains.`);
    } else if (wave === '5') {
      parts.push(`In Wave 5, the final impulse wave. While still bullish, this late-stage position warrants caution as the trend may be maturing.`);
    } else if (wave === 'B') {
      parts.push(`Wave B represents a counter-trend bounce within a correction, often a false rally before further downside.`);
    } else if (wave === 'C') {
      parts.push(`Wave C is the final corrective wave, potentially marking the end of the downtrend and setup for reversal.`);
    } else {
      parts.push(`Currently in Wave ${wave} of the Elliott Wave cycle.`);
    }

    return parts.join(' ');
  }

  /**
   * Generate sentiment analysis explanation
   */
  private generateSentimentExplanation(analysis: any, score: number): string {
    const parts: string[] = [];

    // Polarity explanation
    if (analysis.polarity === 'positive') {
      parts.push(`News sentiment is positive, reflecting favorable media coverage and market buzz.`);
    } else if (analysis.polarity === 'negative') {
      parts.push(`News sentiment is negative, with concerning headlines and pessimistic market chatter.`);
    } else {
      parts.push(`News sentiment is neutral with balanced coverage.`);
    }

    // Hype level explanation
    if (analysis.hypeLevel === 'high') {
      parts.push(`High news volume suggests significant market attention, which can drive volatility.`);
    } else if (analysis.hypeLevel === 'low') {
      parts.push(`Low news activity indicates the stock is flying under the radar with minimal media attention.`);
    }

    // Key topics summary
    if (analysis.keyTopics.length > 0) {
      parts.push(`Key focus areas include ${analysis.keyTopics.slice(0, 3).join(', ').toLowerCase()}.`);
    }

    return parts.join(' ');
  }

  /**
   * Generate macro analysis explanation
   */
  private generateMacroExplanation(indicators: any, score: number): string {
    const parts: string[] = [];

    // VIX interpretation
    if (indicators.vixLevel < 15) {
      parts.push(`VIX at ${indicators.vixLevel.toFixed(1)} reflects low market fear and stable conditions, favorable for risk assets.`);
    } else if (indicators.vixLevel > 30) {
      parts.push(`VIX at ${indicators.vixLevel.toFixed(1)} signals elevated fear and uncertainty, suggesting a defensive stance.`);
    } else {
      parts.push(`VIX at ${indicators.vixLevel.toFixed(1)} indicates moderate volatility and mixed market sentiment.`);
    }

    // Regime explanation
    if (indicators.regime === 'bullish') {
      parts.push(`The broader market regime is bullish, providing a supportive backdrop for long positions.`);
    } else if (indicators.regime === 'bearish') {
      parts.push(`The macro environment is bearish, creating headwinds for equities.`);
    } else {
      parts.push(`Market regime is volatile with uncertain direction, requiring selective positioning.`);
    }

    return parts.join(' ');
  }
}
