import axios from 'axios';

interface NewsItem {
  title: string;
  snippet: string;
  publishedAt: string;
  url: string;
}

interface SentimentAnalysis {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number; // -100 to +100
  hypeLevel: 'low' | 'medium' | 'high';
  confidence: number;
  keyTopics: string[];

  // Enhanced fields
  polarityScore: number; // Same as score, for output compatibility
  memeRiskScore: number; // NewsVolume / (FreeFloat × ShortInterest%)
  mainPositiveTheme?: string;
  mainNegativeTheme?: string;
  sentimentLabel: string; // "Positive", "Negative", or "Neutral"
}

export class SentimentAnalysisService {
  private braveApiKey: string;

  constructor(braveApiKey?: string) {
    this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY || '';
  }

  /**
   * Analyze sentiment from news and social media with context-aware NLP
   */
  async analyzeSentiment(
    symbol: string,
    companyName: string,
    newsData: NewsItem[],
    freeFloat?: number,
    shortInterest?: number
  ): Promise<SentimentAnalysis> {
    try {
      // Entity-aware sentiment analysis (only count sentiment near ticker/company)
      const sentiment = this.analyzeEntityAwareSentiment(newsData, symbol, companyName);

      // Determine hype level based on news volume and recency
      const hypeLevel = this.calculateHypeLevel(newsData);

      // Extract key topics
      const keyTopics = this.extractKeyTopics(newsData.map(n => `${n.title} ${n.snippet}`).join(' '), symbol, companyName);

      // Detect main themes
      const themes = this.detectThemes(newsData, symbol, companyName);

      // Calculate meme risk
      const memeRiskScore = this.calculateMemeRisk(newsData.length, freeFloat, shortInterest);

      // Sentiment label
      const sentimentLabel = sentiment.polarity.charAt(0).toUpperCase() + sentiment.polarity.slice(1);

      return {
        polarity: sentiment.polarity,
        score: sentiment.score,
        hypeLevel,
        confidence: sentiment.confidence,
        keyTopics,
        polarityScore: sentiment.score,
        memeRiskScore,
        mainPositiveTheme: themes.positive,
        mainNegativeTheme: themes.negative,
        sentimentLabel
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        polarity: 'neutral',
        score: 0,
        hypeLevel: 'low',
        confidence: 50,
        keyTopics: [],
        polarityScore: 0,
        memeRiskScore: 0,
        sentimentLabel: 'Neutral'
      };
    }
  }

  /**
   * Analyze sentiment from text using keyword matching
   */
  private analyzeSentimentFromText(text: string): { polarity: 'positive' | 'negative' | 'neutral'; score: number; confidence: number } {
    const lowerText = text.toLowerCase();

    // Positive keywords (reduced weight)
    const positiveWords = [
      'surge', 'beat', 'exceed', 'strong', 'bullish', 'upgrade',
      'soar', 'record', 'breakthrough', 'outstanding', 'excellent'
    ];

    // Negative keywords (expanded and more comprehensive)
    const negativeWords = [
      'loss', 'decline', 'fall', 'drop', 'plunge', 'miss', 'weak',
      'bearish', 'downgrade', 'concern', 'risk', 'problem', 'issue',
      'lawsuit', 'investigation', 'negative', 'pessimistic', 'disappointing',
      'slump', 'crash', 'tumble', 'warning', 'caution', 'threat', 'volatile',
      'uncertainty', 'pressure', 'struggle', 'challenge', 'slowdown', 'cut',
      'layoff', 'fire', 'debt', 'default', 'bankruptcy', 'failure'
    ];

    // Neutral/cautionary keywords (reduce positive bias)
    const neutralWords = [
      'growth', 'revenue', 'increase', 'profit', 'gain', 'rise',
      'innovation', 'positive', 'optimistic', 'success'
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    positiveWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
      positiveCount += matches * 2; // Strong positive weight
    });

    negativeWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
      negativeCount += matches * 2.5; // Slightly stronger negative weight (more conservative)
    });

    neutralWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
      neutralCount += matches * 0.5; // Weak weight for common neutral terms
    });

    const totalCount = positiveCount + negativeCount + neutralCount;

    if (totalCount === 0) {
      return { polarity: 'neutral', score: 0, confidence: 30 };
    }

    // More conservative scoring: negative words have stronger impact
    const netScore = positiveCount - negativeCount;
    const score = (netScore / (totalCount + 1)) * 100; // +1 to dampen extremes

    let polarity: 'positive' | 'negative' | 'neutral';
    if (score > 35) { // Raised threshold for positive
      polarity = 'positive';
    } else if (score < -15) { // Lower threshold for negative (more sensitive)
      polarity = 'negative';
    } else {
      polarity = 'neutral';
    }

    const confidence = Math.min(100, totalCount * 10); // More mentions = higher confidence

    return { polarity, score, confidence };
  }

  /**
   * Calculate hype level based on news volume and recency
   */
  private calculateHypeLevel(newsData: NewsItem[]): 'low' | 'medium' | 'high' {
    const recentNews = newsData.filter(n => {
      const publishedDate = new Date(n.publishedAt);
      const daysDiff = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7; // News from last week
    });

    if (recentNews.length > 10) {
      return 'high';
    } else if (recentNews.length > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Extract key topics from text
   */
  private extractKeyTopics(text: string, symbol: string, companyName: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Common business topics
    const topicKeywords: Record<string, string[]> = {
      'Earnings': ['earnings', 'revenue', 'profit', 'eps', 'quarterly'],
      'Product Launch': ['launch', 'release', 'unveil', 'announce', 'product'],
      'Acquisition': ['acquire', 'acquisition', 'merger', 'buy', 'purchase'],
      'Partnership': ['partner', 'partnership', 'collaborate', 'agreement'],
      'Regulatory': ['regulation', 'sec', 'investigation', 'lawsuit', 'compliance'],
      'Market Expansion': ['expand', 'expansion', 'market', 'growth', 'international'],
      'Innovation': ['innovation', 'technology', 'ai', 'breakthrough', 'patent']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const mentioned = keywords.some(keyword => lowerText.includes(keyword));
      if (mentioned) {
        topics.push(topic);
      }
    }

    return topics.slice(0, 5); // Return top 5 topics
  }

  /**
   * Calculate sentiment score (0-100) - More conservative approach
   */
  calculateSentimentScore(analysis: SentimentAnalysis): number {
    let score = 50; // Start neutral

    // Adjust based on polarity and score (more conservative)
    if (analysis.polarity === 'positive') {
      score += Math.abs(analysis.score) / 3; // Up to +33 (reduced from +50)
    } else if (analysis.polarity === 'negative') {
      score -= Math.abs(analysis.score) / 2; // Down to -50 (kept strong)
    }

    // Adjust based on hype level (more balanced)
    if (analysis.hypeLevel === 'high') {
      score += 5; // Reduced from +10 (high hype can be a warning sign)
    } else if (analysis.hypeLevel === 'low') {
      score -= 8; // Increased penalty (low interest is concerning)
    }

    // Apply confidence penalty for uncertain sentiment
    if (analysis.confidence < 60) {
      score = score * 0.9; // Reduce score by 10% if low confidence
    }

    // Apply meme risk penalty
    if (analysis.memeRiskScore > 3.0) {
      score = score * 0.85; // 15% penalty for extreme speculation
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Entity-aware sentiment analysis
   * Only count sentiment within ±20 tokens of ticker/company name
   */
  private analyzeEntityAwareSentiment(
    newsData: NewsItem[],
    symbol: string,
    companyName: string
  ): { polarity: 'positive' | 'negative' | 'neutral'; score: number; confidence: number } {
    const positiveWords = [
      'surge', 'beat', 'exceed', 'strong', 'bullish', 'upgrade',
      'soar', 'record', 'breakthrough', 'outstanding', 'excellent'
    ];

    const negativeWords = [
      'loss', 'decline', 'fall', 'drop', 'plunge', 'miss', 'weak',
      'bearish', 'downgrade', 'concern', 'risk', 'problem', 'issue',
      'lawsuit', 'investigation', 'negative', 'pessimistic', 'disappointing',
      'slump', 'crash', 'tumble', 'warning', 'caution', 'threat', 'volatile',
      'uncertainty', 'pressure', 'struggle', 'challenge', 'slowdown', 'cut',
      'layoff', 'fire', 'debt', 'default', 'bankruptcy', 'failure'
    ];

    const neutralWords = [
      'growth', 'revenue', 'increase', 'profit', 'gain', 'rise',
      'innovation', 'positive', 'optimistic', 'success'
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    // Entity patterns to search for
    const entityPatterns = [
      new RegExp(`\\b${symbol}\\b`, 'gi'),
      new RegExp(`\\b${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    ];

    newsData.forEach(item => {
      const text = `${item.title} ${item.snippet}`;
      const words = text.split(/\s+/);

      // Find entity positions
      const entityPositions: number[] = [];
      words.forEach((word, idx) => {
        if (entityPatterns.some(pattern => pattern.test(word))) {
          entityPositions.push(idx);
        }
      });

      // For each entity position, analyze ±20 tokens
      entityPositions.forEach(entityPos => {
        const startIdx = Math.max(0, entityPos - 20);
        const endIdx = Math.min(words.length, entityPos + 20);
        const contextWords = words.slice(startIdx, endIdx);
        const contextText = contextWords.join(' ').toLowerCase();

        // Count sentiment words in context
        positiveWords.forEach(word => {
          const matches = (contextText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
          positiveCount += matches * 2.0; // 2.0× weight
        });

        negativeWords.forEach(word => {
          const matches = (contextText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
          negativeCount += matches * 2.5; // 2.5× weight
        });

        neutralWords.forEach(word => {
          const matches = (contextText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
          neutralCount += matches * 0.5; // 0.5× weight
        });
      });
    });

    const totalCount = positiveCount + negativeCount + neutralCount;

    if (totalCount === 0) {
      return { polarity: 'neutral', score: 0, confidence: 30 };
    }

    // Calculate net score
    const netScore = positiveCount - negativeCount;
    const score = (netScore / (totalCount + 1)) * 100;

    let polarity: 'positive' | 'negative' | 'neutral';
    if (score > 35) {
      polarity = 'positive';
    } else if (score < -15) {
      polarity = 'negative';
    } else {
      polarity = 'neutral';
    }

    const confidence = Math.min(100, totalCount * 10);

    return { polarity, score, confidence };
  }

  /**
   * Detect main positive and negative themes
   */
  private detectThemes(
    newsData: NewsItem[],
    symbol: string,
    companyName: string
  ): { positive?: string; negative?: string } {
    const positiveThemes: Record<string, number> = {
      'earnings beat': 0,
      'revenue growth': 0,
      'product launch': 0,
      'partnership': 0,
      'market expansion': 0,
      'innovation': 0,
      'analyst upgrade': 0
    };

    const negativeThemes: Record<string, number> = {
      'earnings miss': 0,
      'supply risk': 0,
      'regulatory concern': 0,
      'competition': 0,
      'debt concern': 0,
      'lawsuit': 0,
      'analyst downgrade': 0
    };

    newsData.forEach(item => {
      const text = `${item.title} ${item.snippet}`.toLowerCase();

      // Positive themes
      if (text.includes('beat') && (text.includes('earnings') || text.includes('estimates'))) {
        positiveThemes['earnings beat']++;
      }
      if (text.includes('revenue') && (text.includes('growth') || text.includes('increase'))) {
        positiveThemes['revenue growth']++;
      }
      if (text.includes('launch') || text.includes('unveil')) {
        positiveThemes['product launch']++;
      }
      if (text.includes('partner') || text.includes('collaboration')) {
        positiveThemes['partnership']++;
      }
      if (text.includes('expand') || text.includes('market share')) {
        positiveThemes['market expansion']++;
      }
      if (text.includes('innovation') || text.includes('breakthrough')) {
        positiveThemes['innovation']++;
      }
      if (text.includes('upgrade') && text.includes('analyst')) {
        positiveThemes['analyst upgrade']++;
      }

      // Negative themes
      if (text.includes('miss') && (text.includes('earnings') || text.includes('estimates'))) {
        negativeThemes['earnings miss']++;
      }
      if (text.includes('supply') && (text.includes('chain') || text.includes('shortage') || text.includes('risk'))) {
        negativeThemes['supply risk']++;
      }
      if (text.includes('regulatory') || text.includes('sec') || text.includes('investigation')) {
        negativeThemes['regulatory concern']++;
      }
      if (text.includes('competition') || text.includes('competitive')) {
        negativeThemes['competition']++;
      }
      if (text.includes('debt') && (text.includes('concern') || text.includes('high'))) {
        negativeThemes['debt concern']++;
      }
      if (text.includes('lawsuit') || text.includes('litigation')) {
        negativeThemes['lawsuit']++;
      }
      if (text.includes('downgrade') && text.includes('analyst')) {
        negativeThemes['analyst downgrade']++;
      }
    });

    // Find most mentioned themes
    const topPositive = Object.entries(positiveThemes)
      .sort((a, b) => b[1] - a[1])
      .find(([_, count]) => count > 0)?.[0];

    const topNegative = Object.entries(negativeThemes)
      .sort((a, b) => b[1] - a[1])
      .find(([_, count]) => count > 0)?.[0];

    return {
      positive: topPositive,
      negative: topNegative
    };
  }

  /**
   * Calculate meme risk
   * MemeRisk = NewsVolume / (FreeFloat × ShortInterest%)
   */
  private calculateMemeRisk(newsVolume: number, freeFloat?: number, shortInterest?: number): number {
    if (!freeFloat || !shortInterest || freeFloat === 0 || shortInterest === 0) {
      return 0; // Cannot calculate without data
    }

    // Convert short interest from percentage to decimal
    const shortInterestDecimal = shortInterest / 100;

    // Calculate meme risk
    const denominator = freeFloat * shortInterestDecimal;

    if (denominator === 0) {
      return 0;
    }

    const memeRisk = newsVolume / denominator;

    // Scale to reasonable range (cap at 10)
    return Math.min(10, parseFloat(memeRisk.toFixed(2)));
  }
}
