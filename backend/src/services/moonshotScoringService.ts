import { StockResearchData } from '../types/index.js';

export interface MoonshotScoreBreakdown {
  totalScore: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'; // S = exceptional, F = poor
  category: 'High Potential' | 'Moderate Potential' | 'Low Potential' | 'Not a Moonshot';
  components: {
    rumorsAndPolitics: {
      score: number; // 0-50
      weight: number; // 50%
      factors: {
        congressionalBuying: number;
        congressionalSelling: number;
        politicalNewsPositive: number;
        politicalNewsNegative: number;
      };
      details: string[];
    };
    newsImpact: {
      score: number; // 0-25
      weight: number; // 25%
      factors: {
        marketauxSentiment: number;
        alphaVantageSentiment: number;
        newsVolume: number;
      };
      details: string[];
    };
    socialSentiment: {
      score: number; // 0-15
      weight: number; // 15%
      factors: {
        redditBuzz: number;
        socialMomentum: number;
      };
      details: string[];
    };
    insiderActivity: {
      score: number; // 0-10
      weight: number; // 10%
      factors: {
        insiderBuying: number;
        insiderSelling: number;
        insiderConfidence: number;
      };
      details: string[];
    };
  };
  strengths: string[];
  weaknesses: string[];
  riskLevel: 'Very High' | 'High' | 'Medium' | 'Low';
  recommendation: string;
}

export class MoonshotScoringService {

  calculateMoonshotScore(data: StockResearchData): MoonshotScoreBreakdown {
    // Initialize component scores
    const rumorsAndPolitics = this.scoreRumorsAndPolitics(data);
    const newsImpact = this.scoreNewsImpact(data);
    const socialSentiment = this.scoreSocialSentiment(data);
    const insiderActivity = this.scoreInsiderActivity(data);

    // Calculate total score
    const totalScore = Math.min(100, Math.round(
      rumorsAndPolitics.score +
      newsImpact.score +
      socialSentiment.score +
      insiderActivity.score
    ));

    // Determine grade
    const grade = this.calculateGrade(totalScore);

    // Determine category
    const category = this.determineCategory(totalScore);

    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses({
      rumorsAndPolitics,
      newsImpact,
      socialSentiment,
      insiderActivity
    });

    // Determine risk level
    const riskLevel = this.determineRiskLevel(data, totalScore);

    // Generate recommendation
    const recommendation = this.generateRecommendation(totalScore, category, strengths, weaknesses);

    return {
      totalScore,
      grade,
      category,
      components: {
        rumorsAndPolitics,
        newsImpact,
        socialSentiment,
        insiderActivity
      },
      strengths,
      weaknesses,
      riskLevel,
      recommendation
    };
  }

  private scoreRumorsAndPolitics(data: StockResearchData): MoonshotScoreBreakdown['components']['rumorsAndPolitics'] {
    let score = 0;
    const maxScore = 50;
    const details: string[] = [];
    const factors = {
      congressionalBuying: 0,
      congressionalSelling: 0,
      politicalNewsPositive: 0,
      politicalNewsNegative: 0
    };

    // Congressional Trading (up to 25 points)
    if (data.quiverData) {
      const q = data.quiverData;

      // Buying signal (positive)
      if (q.congressionalBuys > 0) {
        const buyScore = Math.min(15, q.congressionalBuys * 5);
        factors.congressionalBuying = buyScore;
        score += buyScore;
        details.push(`${q.congressionalBuys} congressional purchase${q.congressionalBuys > 1 ? 's' : ''} detected (+${buyScore} points)`);
      }

      // Selling signal (negative)
      if (q.congressionalSells > 0) {
        const sellPenalty = Math.min(10, q.congressionalSells * 3);
        factors.congressionalSelling = -sellPenalty;
        score -= sellPenalty;
        details.push(`${q.congressionalSells} congressional sale${q.congressionalSells > 1 ? 's' : ''} detected (-${sellPenalty} points)`);
      }

      if (q.congressionalBuys === 0 && q.congressionalSells === 0) {
        details.push('No recent congressional trading activity');
      }
    } else {
      details.push('Congressional trading data unavailable');
    }

    // Political News Sentiment (up to 25 points)
    const politicalKeywords = ['tariff', 'regulation', 'policy', 'government', 'congress', 'senate', 'tax', 'subsidy'];
    const politicalNews = data.news.filter(n =>
      politicalKeywords.some(kw => n.title.toLowerCase().includes(kw) || n.snippet.toLowerCase().includes(kw))
    );

    if (politicalNews.length > 0) {
      const avgSentiment = politicalNews
        .filter(n => n.sentimentScore !== undefined)
        .reduce((sum, n) => sum + ((n.sentimentScore || 0.5) - 0.5) * 2, 0) / Math.max(1, politicalNews.length);

      if (avgSentiment > 0.1) {
        const politicalScore = Math.min(15, Math.round(avgSentiment * 50));
        factors.politicalNewsPositive = politicalScore;
        score += politicalScore;
        details.push(`Positive political news sentiment (+${politicalScore} points)`);
      } else if (avgSentiment < -0.1) {
        const politicalPenalty = Math.min(15, Math.round(Math.abs(avgSentiment) * 50));
        factors.politicalNewsNegative = -politicalPenalty;
        score -= politicalPenalty;
        details.push(`Negative political news sentiment (-${politicalPenalty} points)`);
      }
    }

    return {
      score: Math.max(0, Math.min(maxScore, score)),
      weight: 0.5,
      factors,
      details
    };
  }

  private scoreNewsImpact(data: StockResearchData): MoonshotScoreBreakdown['components']['newsImpact'] {
    let score = 0;
    const maxScore = 25;
    const details: string[] = [];
    const factors = {
      marketauxSentiment: 0,
      alphaVantageSentiment: 0,
      newsVolume: 0
    };

    // Marketaux Sentiment (up to 10 points)
    const marketauxNews = data.news.filter(n => n.sentimentScore !== undefined);
    if (marketauxNews.length > 0) {
      const avgSentiment = marketauxNews.reduce((sum, n) => sum + ((n.sentimentScore || 0.5) - 0.5) * 2, 0) / marketauxNews.length;

      if (avgSentiment > 0.05) {
        const sentimentScore = Math.min(10, Math.round(avgSentiment * 30));
        factors.marketauxSentiment = sentimentScore;
        score += sentimentScore;
        details.push(`Positive Marketaux sentiment: ${(avgSentiment * 100).toFixed(0)}% (+${sentimentScore} points)`);
      } else if (avgSentiment < -0.05) {
        details.push(`Negative Marketaux sentiment: ${(avgSentiment * 100).toFixed(0)}% (0 points - bearish)`);
      } else {
        details.push(`Neutral Marketaux sentiment (0 points)`);
      }
    }

    // Alpha Vantage Sentiment (up to 10 points)
    if (data.alphaVantageData && data.alphaVantageData.articleCount > 0) {
      const avScore = data.alphaVantageData.sentimentScore;

      if (avScore > 0.05) {
        const sentimentScore = Math.min(10, Math.round(avScore * 30));
        factors.alphaVantageSentiment = sentimentScore;
        score += sentimentScore;
        details.push(`Bullish Alpha Vantage sentiment: ${(avScore * 100).toFixed(0)}% (+${sentimentScore} points)`);
      } else if (avScore < -0.05) {
        details.push(`Bearish Alpha Vantage sentiment: ${(avScore * 100).toFixed(0)}% (0 points)`);
      }
    }

    // News Volume (up to 5 points)
    const newsCount = data.news.length;
    if (newsCount >= 10) {
      factors.newsVolume = 5;
      score += 5;
      details.push(`High news volume: ${newsCount} articles (+5 points)`);
    } else if (newsCount >= 5) {
      factors.newsVolume = 3;
      score += 3;
      details.push(`Moderate news volume: ${newsCount} articles (+3 points)`);
    } else if (newsCount > 0) {
      factors.newsVolume = 1;
      score += 1;
      details.push(`Low news volume: ${newsCount} articles (+1 point)`);
    }

    return {
      score: Math.max(0, Math.min(maxScore, score)),
      weight: 0.25,
      factors,
      details
    };
  }

  private scoreSocialSentiment(data: StockResearchData): MoonshotScoreBreakdown['components']['socialSentiment'] {
    let score = 0;
    const maxScore = 15;
    const details: string[] = [];
    const factors = {
      redditBuzz: 0,
      socialMomentum: 0
    };

    if (data.quiverData) {
      const redditMentions = data.quiverData.redditMentions;

      // Reddit WSB mentions (up to 10 points)
      if (redditMentions > 100) {
        factors.redditBuzz = 10;
        score += 10;
        details.push(`Very high Reddit buzz: ${redditMentions} WSB mentions (+10 points - MEME STOCK POTENTIAL)`);
      } else if (redditMentions > 50) {
        factors.redditBuzz = 7;
        score += 7;
        details.push(`High Reddit buzz: ${redditMentions} WSB mentions (+7 points)`);
      } else if (redditMentions > 20) {
        factors.redditBuzz = 5;
        score += 5;
        details.push(`Moderate Reddit buzz: ${redditMentions} WSB mentions (+5 points)`);
      } else if (redditMentions > 5) {
        factors.redditBuzz = 2;
        score += 2;
        details.push(`Low Reddit buzz: ${redditMentions} WSB mentions (+2 points)`);
      } else if (redditMentions > 0) {
        factors.redditBuzz = 1;
        score += 1;
        details.push(`Minimal Reddit mentions: ${redditMentions} (+1 point)`);
      } else {
        details.push('No Reddit WSB mentions detected');
      }

      // Social momentum bonus (up to 5 points)
      if (redditMentions > 50 && factors.redditBuzz > 0) {
        factors.socialMomentum = 5;
        score += 5;
        details.push('Retail momentum building (+5 points)');
      }
    } else {
      details.push('Social sentiment data unavailable');
    }

    return {
      score: Math.max(0, Math.min(maxScore, score)),
      weight: 0.15,
      factors,
      details
    };
  }

  private scoreInsiderActivity(data: StockResearchData): MoonshotScoreBreakdown['components']['insiderActivity'] {
    let score = 0;
    const maxScore = 10;
    const details: string[] = [];
    const factors = {
      insiderBuying: 0,
      insiderSelling: 0,
      insiderConfidence: 0
    };

    if (data.quiverData) {
      const { insiderBuys, insiderSells } = data.quiverData;

      // Insider buying (positive signal)
      if (insiderBuys > 0) {
        const buyScore = Math.min(6, insiderBuys * 2);
        factors.insiderBuying = buyScore;
        score += buyScore;
        details.push(`${insiderBuys} insider purchase${insiderBuys > 1 ? 's' : ''} (+${buyScore} points - executives are confident)`);
      }

      // Insider selling (mild negative)
      if (insiderSells > insiderBuys && insiderSells > 2) {
        const sellPenalty = Math.min(4, (insiderSells - insiderBuys));
        factors.insiderSelling = -sellPenalty;
        score -= sellPenalty;
        details.push(`Heavy insider selling detected (-${sellPenalty} points)`);
      } else if (insiderSells > 0) {
        details.push(`${insiderSells} insider sale${insiderSells > 1 ? 's' : ''} (could be routine)`);
      }

      // Net insider confidence bonus
      if (insiderBuys > insiderSells && insiderBuys > 0) {
        factors.insiderConfidence = 4;
        score += 4;
        details.push('Net insider buying - high confidence (+4 points)');
      }

      if (insiderBuys === 0 && insiderSells === 0) {
        details.push('No recent insider trading activity');
      }
    } else {
      details.push('Insider trading data unavailable');
    }

    return {
      score: Math.max(0, Math.min(maxScore, score)),
      weight: 0.10,
      factors,
      details
    };
  }

  private calculateGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'S'; // Exceptional moonshot potential
    if (score >= 70) return 'A'; // Strong moonshot potential
    if (score >= 55) return 'B'; // Good moonshot potential
    if (score >= 40) return 'C'; // Moderate moonshot potential
    if (score >= 25) return 'D'; // Weak moonshot potential
    return 'F'; // Not a moonshot
  }

  private determineCategory(score: number): MoonshotScoreBreakdown['category'] {
    if (score >= 70) return 'High Potential';
    if (score >= 40) return 'Moderate Potential';
    if (score >= 20) return 'Low Potential';
    return 'Not a Moonshot';
  }

  private analyzeStrengthsWeaknesses(components: any): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze each component
    if (components.rumorsAndPolitics.score >= 30) {
      strengths.push('Strong political/regulatory tailwinds');
    } else if (components.rumorsAndPolitics.score < 10) {
      weaknesses.push('Lack of political catalysts');
    }

    if (components.newsImpact.score >= 15) {
      strengths.push('Positive media coverage and sentiment');
    } else if (components.newsImpact.score < 5) {
      weaknesses.push('Weak or negative news sentiment');
    }

    if (components.socialSentiment.score >= 10) {
      strengths.push('High retail investor interest (meme potential)');
    } else if (components.socialSentiment.score < 3) {
      weaknesses.push('Low social media buzz');
    }

    if (components.insiderActivity.score >= 7) {
      strengths.push('Insider confidence signal');
    } else if (components.insiderActivity.score < 0) {
      weaknesses.push('Concerning insider selling activity');
    }

    return { strengths, weaknesses };
  }

  private determineRiskLevel(data: StockResearchData, score: number): 'Very High' | 'High' | 'Medium' | 'Low' {
    // Moonshots are inherently risky
    if (score >= 70) return 'Very High'; // High potential = high risk
    if (score >= 40) return 'High';
    if (score >= 20) return 'Medium';
    return 'Low'; // Not really a moonshot
  }

  private generateRecommendation(
    score: number,
    category: string,
    strengths: string[],
    weaknesses: string[]
  ): string {
    if (score >= 70) {
      return `STRONG MOONSHOT: This stock shows exceptional moonshot potential with ${strengths.length} key strength(s). High risk/high reward opportunity. Consider for speculative portfolio allocation.`;
    } else if (score >= 55) {
      return `GOOD MOONSHOT: Above-average moonshot characteristics detected. ${strengths.length > 0 ? 'Notable strengths include: ' + strengths[0] : 'Monitor closely for entry opportunity.'} Suitable for aggressive growth strategies.`;
    } else if (score >= 40) {
      return `MODERATE MOONSHOT: Some moonshot indicators present, but also ${weaknesses.length} weakness(es). Best for experienced traders with high risk tolerance.`;
    } else if (score >= 25) {
      return `WEAK MOONSHOT: Limited moonshot potential. ${weaknesses.length > 0 ? 'Key concern: ' + weaknesses[0] : 'Lacks strong catalysts.'} Better opportunities likely exist elsewhere.`;
    } else {
      return `NOT A MOONSHOT: This stock does not exhibit moonshot characteristics. Consider traditional fundamental analysis instead.`;
    }
  }
}
