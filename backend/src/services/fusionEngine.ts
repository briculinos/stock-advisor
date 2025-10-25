interface FusionInput {
  technicalScore: number;
  fundamentalScore: number;
  sentimentScore: number;
  macroScore: number;
  currentPrice: number;
  symbol: string;
  industry?: string;
  vixLevel?: number;
  criticalRisks?: string[];
  atr?: number; // Average True Range for dynamic price targets
  technicalConfidence?: number; // Confidence in technical analysis (0-100)
  fundamentalConfidence?: number; // Confidence in fundamental analysis (0-100)
  sentimentConfidence?: number; // Confidence in sentiment analysis (0-100)
  macroConfidence?: number; // Confidence in macro analysis (0-100)
}

interface FusionOutput {
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
  confidence: number;
  compositeScore: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  rationale: string;
  breakdown: {
    technical: number;
    fundamental: number;
    sentiment: number;
    macro: number;
  };
  adjustedWeights: {
    technical: number;
    fundamental: number;
    sentiment: number;
    macro: number;
  };
  criticalFlag: boolean;
  finalComposite: number;
  positionSizeMultiplier: number; // 1.0 = normal, 0.5 = half position if Macro & Sentiment both negative
}

export class FusionEngine {
  // Base Weights: 40% technical, 25% fundamental, 20% sentiment, 15% macro
  private readonly BASE_WEIGHTS = {
    technical: 0.40,
    fundamental: 0.25,
    sentiment: 0.20,
    macro: 0.15
  };

  /**
   * Fuse all data sources with adaptive weighting and veto logic
   */
  fuse(input: FusionInput): FusionOutput {
    // 1. Detect critical risks (veto logic)
    const criticalFlag = this.detectCriticalRisks(input);

    // 2. Determine stock type for adaptive weighting
    const stockType = this.detectStockType(input);

    // 3. Prepare confidence values (default to 75 if not provided)
    const confidences = {
      technical: input.technicalConfidence ?? 75,
      fundamental: input.fundamentalConfidence ?? 75,
      sentiment: input.sentimentConfidence ?? 75,
      macro: input.macroConfidence ?? 75
    };

    // 4. Calculate adjusted weights based on context AND confidence
    const adjustedWeights = this.calculateAdaptiveWeights(
      stockType,
      input.vixLevel || 20,
      criticalFlag,
      confidences
    );

    // 5. Calculate weighted composite score with adjusted weights
    const compositeScore =
      (input.technicalScore * adjustedWeights.technical) +
      (input.fundamentalScore * adjustedWeights.fundamental) +
      (input.sentimentScore * adjustedWeights.sentiment) +
      (input.macroScore * adjustedWeights.macro);

    // 6. Apply critical risk veto: cap BUY signals at 55 (forces HOLD/AVOID)
    let finalComposite = compositeScore;
    if (criticalFlag && compositeScore > 55) {
      finalComposite = 55;
    }

    // 7. Detect conflicting signals
    const scores = [input.technicalScore, input.fundamentalScore, input.sentimentScore, input.macroScore];
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const hasConflictingSignals = (maxScore - minScore) > 50; // High divergence

    // 8. Detect low data confidence
    const avgConfidence = (confidences.technical + confidences.fundamental + confidences.sentiment + confidences.macro) / 4;
    const lowDataConfidence = avgConfidence < 50;

    // 9. Determine recommendation based on final composite score
    let recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
    let confidence: number;

    // AVOID: conflicting signals or low data confidence
    if (hasConflictingSignals || lowDataConfidence) {
      recommendation = 'AVOID';
      confidence = Math.max(30, avgConfidence * 0.8);
    }
    // BUY: composite ≥ 65
    else if (finalComposite >= 65) {
      recommendation = 'BUY';
      confidence = Math.min(95, finalComposite + 10);
    }
    // SELL: composite ≤ 44
    else if (finalComposite <= 44) {
      recommendation = 'SELL';
      confidence = Math.min(95, (100 - finalComposite) + 10);
    }
    // HOLD: 45-64
    else {
      recommendation = 'HOLD';
      confidence = 100 - Math.abs(finalComposite - 50) * 2;
    }

    // Reduce confidence if critical flag is set
    if (criticalFlag) {
      confidence = Math.max(30, confidence - 25);
    }

    // 10. Calculate position size multiplier
    // Position size capped 0.5× normal if Macro & Sentiment both negative
    let positionSizeMultiplier = 1.0;
    const macroNegative = input.macroScore < 45;
    const sentimentNegative = input.sentimentScore < 45;
    if (macroNegative && sentimentNegative) {
      positionSizeMultiplier = 0.5;
    }

    // 11. Calculate entry, stop, and target prices (ATR-based if available)
    const prices = this.calculatePriceTargets(
      input.currentPrice,
      recommendation,
      finalComposite,
      input.atr
    );

    // 12. Generate rationale
    const rationale = this.generateRationale(input, finalComposite, recommendation, adjustedWeights, criticalFlag);

    return {
      recommendation,
      confidence,
      compositeScore,
      finalComposite,
      entry: prices.entry,
      stop: prices.stop,
      target1: prices.target1,
      target2: prices.target2,
      rationale,
      breakdown: {
        technical: input.technicalScore,
        fundamental: input.fundamentalScore,
        sentiment: input.sentimentScore,
        macro: input.macroScore
      },
      adjustedWeights,
      criticalFlag,
      positionSizeMultiplier
    };
  }

  /**
   * Detect critical risks that trigger veto logic
   */
  private detectCriticalRisks(input: FusionInput): boolean {
    const risks = input.criticalRisks || [];

    // Critical risk keywords
    const criticalKeywords = [
      'fraud', 'investigation', 'sec probe', 'lawsuit', 'bankruptcy',
      'delisting', 'accounting fraud', 'insider trading', 'regulatory action',
      'criminal investigation', 'class action', 'recall', 'safety issue'
    ];

    // Check if any critical risk is present
    const hasCriticalRisk = risks.some(risk => {
      const lowerRisk = risk.toLowerCase();
      return criticalKeywords.some(keyword => lowerRisk.includes(keyword));
    });

    // Also check if sentiment score is extremely negative (potential hidden crisis)
    const extremeNegativeSentiment = input.sentimentScore < 20;

    // Check macro shock (VIX > 40 = market panic)
    const macroShock = (input.vixLevel || 20) > 40;

    return hasCriticalRisk || extremeNegativeSentiment || macroShock;
  }

  /**
   * Detect stock type based on industry and characteristics
   */
  private detectStockType(input: FusionInput): 'growth' | 'defensive' | 'neutral' {
    const industry = (input.industry || '').toLowerCase();

    // Growth / Tech stocks
    const growthIndustries = ['technology', 'software', 'internet', 'biotech', 'crypto', 'ai', 'saas', 'semiconductor'];
    const isGrowth = growthIndustries.some(ind => industry.includes(ind));

    // Defensive / Dividend stocks
    const defensiveIndustries = ['utilities', 'consumer staples', 'healthcare', 'telecom', 'reit', 'dividend'];
    const isDefensive = defensiveIndustries.some(ind => industry.includes(ind));

    if (isGrowth) return 'growth';
    if (isDefensive) return 'defensive';
    return 'neutral';
  }

  /**
   * Calculate adaptive weights based on context with confidence-based dynamic weighting
   */
  private calculateAdaptiveWeights(
    stockType: 'growth' | 'defensive' | 'neutral',
    vixLevel: number,
    criticalFlag: boolean,
    confidences?: {
      technical: number;
      fundamental: number;
      sentiment: number;
      macro: number;
    }
  ): { technical: number; fundamental: number; sentiment: number; macro: number } {
    // Start with base weights
    let weights = { ...this.BASE_WEIGHTS };

    // Adjustment 1: Stock type adaptation
    if (stockType === 'growth') {
      // Growth/Tech stocks: Sentiment + Macro gain +10%
      weights.sentiment += 0.10;
      weights.macro += 0.10;
      weights.technical -= 0.10;
      weights.fundamental -= 0.10;
    } else if (stockType === 'defensive') {
      // Defensive/Dividend stocks: Fundamental + Macro gain +15%
      weights.fundamental += 0.15;
      weights.macro += 0.15;
      weights.technical -= 0.15;
      weights.sentiment -= 0.15;
    }

    // Adjustment 2: High volatility regime (VIX > 25)
    if (vixLevel > 25) {
      weights.technical -= 0.15;
      weights.macro += 0.15;
    }

    // Adjustment 3: Critical risk detected - emphasize fundamentals
    if (criticalFlag) {
      weights.fundamental += 0.10;
      weights.sentiment -= 0.10;
    }

    // Adjustment 4: Confidence-based dynamic weighting
    // Down-weight low-confidence sources and redistribute to high-confidence sources
    if (confidences) {
      // Normalize confidences to 0-1 range
      const normConfidences = {
        technical: confidences.technical / 100,
        fundamental: confidences.fundamental / 100,
        sentiment: confidences.sentiment / 100,
        macro: confidences.macro / 100
      };

      // Apply confidence multipliers to weights
      // Low confidence (< 0.6) → reduce weight, High confidence (> 0.8) → increase weight
      const confidenceAdjusted = {
        technical: weights.technical * normConfidences.technical,
        fundamental: weights.fundamental * normConfidences.fundamental,
        sentiment: weights.sentiment * normConfidences.sentiment,
        macro: weights.macro * normConfidences.macro
      };

      weights = confidenceAdjusted;
    }

    // Normalize weights to ensure they sum to 1.0
    const total = weights.technical + weights.fundamental + weights.sentiment + weights.macro;
    weights.technical /= total;
    weights.fundamental /= total;
    weights.sentiment /= total;
    weights.macro /= total;

    return weights;
  }

  /**
   * Calculate entry, stop, and target prices using ATR-based methodology
   */
  private calculatePriceTargets(
    currentPrice: number,
    recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID',
    score: number,
    atr?: number
  ): { entry: number; stop: number; target1: number; target2: number } {
    let entry: number;
    let stop: number;
    let target1: number;
    let target2: number;

    // If ATR is available, use ATR-based calculations
    if (atr && atr > 0) {
      if (recommendation === 'BUY') {
        // ATR-based BUY targets
        entry = currentPrice - (0.5 * atr);
        stop = entry - (2.0 * atr);
        target1 = entry + (2.0 * atr);
        target2 = entry + (4.0 * atr);

      } else if (recommendation === 'SELL') {
        // ATR-based SELL targets (short position)
        entry = currentPrice + (0.5 * atr);
        stop = entry + (2.0 * atr);
        target1 = entry - (2.0 * atr);
        target2 = entry - (4.0 * atr);

      } else { // HOLD or AVOID
        entry = currentPrice;
        stop = currentPrice - (1.5 * atr);
        target1 = currentPrice + (1.0 * atr);
        target2 = currentPrice + (2.0 * atr);
      }
    } else {
      // Fallback to percentage-based if ATR not available
      if (recommendation === 'BUY') {
        entry = currentPrice * 0.98;
        stop = entry * 0.90;
        const upside1 = 1 + (score / 100) * 0.15;
        const upside2 = 1 + (score / 100) * 0.30;
        target1 = entry * upside1;
        target2 = entry * upside2;

      } else if (recommendation === 'SELL') {
        entry = currentPrice * 1.02;
        stop = entry * 1.10;
        const downside1 = 1 - ((100 - score) / 100) * 0.10;
        const downside2 = 1 - ((100 - score) / 100) * 0.20;
        target1 = entry * downside1;
        target2 = entry * downside2;

      } else { // HOLD or AVOID
        entry = currentPrice;
        stop = currentPrice * 0.93;
        target1 = currentPrice * 1.05;
        target2 = currentPrice * 1.10;
      }
    }

    return {
      entry: parseFloat(entry.toFixed(2)),
      stop: parseFloat(stop.toFixed(2)),
      target1: parseFloat(target1.toFixed(2)),
      target2: parseFloat(target2.toFixed(2))
    };
  }

  /**
   * Generate human-readable rationale with adaptive weighting context
   */
  private generateRationale(
    input: FusionInput,
    compositeScore: number,
    recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID',
    adjustedWeights: { technical: number; fundamental: number; sentiment: number; macro: number },
    criticalFlag: boolean
  ): string {
    const parts: string[] = [];

    // Add critical risk warning first if present
    if (criticalFlag) {
      parts.push(`⚠️ CRITICAL RISK DETECTED: Recommendation capped at HOLD due to significant risk factors (fraud, investigation, extreme sentiment, or macro shock).`);
    }

    // Handle AVOID recommendation separately
    if (recommendation === 'AVOID') {
      parts.push(`AVOID signal detected due to conflicting data sources or insufficient confidence in the analysis.`);

      // Identify conflicting factors
      const factors = [
        { name: 'Technical', score: input.technicalScore },
        { name: 'Fundamental', score: input.fundamentalScore },
        { name: 'Sentiment', score: input.sentimentScore },
        { name: 'Macro', score: input.macroScore }
      ];

      const sorted = factors.sort((a, b) => b.score - a.score);
      const strongest = sorted[0];
      const weakest = sorted[sorted.length - 1];

      if (Math.abs(strongest.score - weakest.score) > 50) {
        parts.push(`Major divergence detected: ${strongest.name} shows ${strongest.score.toFixed(0)}/100 while ${weakest.name} shows ${weakest.score.toFixed(0)}/100.`);
        parts.push(`This lack of consensus across analytical dimensions suggests waiting for clearer alignment before taking a position.`);
      } else {
        parts.push(`Low data confidence across multiple analytical sources prevents a reliable recommendation at this time.`);
        parts.push(`Consider waiting for more data or conducting additional due diligence before investing.`);
      }

      return parts.join(' ');
    }

    // Identify strongest and weakest factors
    const factors = [
      { name: 'Technical', score: input.technicalScore, weight: adjustedWeights.technical },
      { name: 'Fundamental', score: input.fundamentalScore, weight: adjustedWeights.fundamental },
      { name: 'Sentiment', score: input.sentimentScore, weight: adjustedWeights.sentiment },
      { name: 'Macro', score: input.macroScore, weight: adjustedWeights.macro }
    ];

    const sorted = factors.sort((a, b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    // Build rationale with detailed reasoning
    if (recommendation === 'BUY') {
      parts.push(`Strong buy signal detected with a composite score of ${compositeScore.toFixed(1)}/100.`);
      parts.push(`This recommendation is primarily driven by ${strongest.name.toLowerCase()} analysis, which scores ${strongest.score.toFixed(0)}/100 (weighted at ${(strongest.weight * 100).toFixed(0)}%).`);

      // Explain contribution of each factor
      const supportingFactors = factors.filter(f => f.score >= 60 && f.name !== strongest.name);
      if (supportingFactors.length > 0) {
        const names = supportingFactors.map(f => f.name.toLowerCase()).join(' and ');
        parts.push(`Supporting this view, ${names} also show${supportingFactors.length === 1 ? 's' : ''} bullish indicators.`);
      }

      if (weakest.score < 40) {
        parts.push(`However, ${weakest.name.toLowerCase()} factors (${weakest.score.toFixed(0)}/100) suggest caution and should be monitored closely.`);
      }

      parts.push(`The weighted average of all factors aligns toward accumulation at current levels.`);
    } else if (recommendation === 'SELL') {
      parts.push(`Sell signal detected with a composite score of ${compositeScore.toFixed(1)}/100.`);
      parts.push(`The bearish outlook is primarily influenced by ${weakest.name.toLowerCase()} analysis showing concerning trends at ${weakest.score.toFixed(0)}/100.`);

      // Count bearish factors
      const bearishFactors = factors.filter(f => f.score <= 40);
      if (bearishFactors.length > 1) {
        parts.push(`Multiple factors (${bearishFactors.map(f => f.name.toLowerCase()).join(', ')}) are signaling weakness, creating a confluence of negative indicators.`);
      }

      if (strongest.score > 60) {
        parts.push(`Despite positive ${strongest.name.toLowerCase()} readings (${strongest.score.toFixed(0)}/100), the overall weighted analysis suggests risk reduction.`);
      }

      parts.push(`Consider taking profits or implementing protective strategies.`);
    } else {
      parts.push(`Neutral outlook with a composite score of ${compositeScore.toFixed(1)}/100.`);
      parts.push(`The analysis reveals mixed signals: ${strongest.name.toLowerCase()} is relatively positive (${strongest.score.toFixed(0)}/100) while ${weakest.name.toLowerCase()} shows weakness (${weakest.score.toFixed(0)}/100).`);

      // Check if scores are converging around neutral
      const variance = factors.reduce((sum, f) => sum + Math.pow(f.score - 50, 2), 0) / factors.length;
      if (variance < 200) {
        parts.push(`All factors are relatively balanced, suggesting the market is in equilibrium.`);
      } else {
        parts.push(`Divergent signals across different analytical dimensions suggest waiting for a clearer trend to emerge.`);
      }

      parts.push(`A wait-and-see approach is recommended until stronger directional conviction develops.`);
    }

    return parts.join(' ');
  }

  /**
   * Get detailed breakdown text
   */
  getBreakdownText(breakdown: FusionOutput['breakdown']): string {
    return `Technical: ${breakdown.technical.toFixed(0)}/100 (40% weight) | ` +
           `Fundamental: ${breakdown.fundamental.toFixed(0)}/100 (25% weight) | ` +
           `Sentiment: ${breakdown.sentiment.toFixed(0)}/100 (20% weight) | ` +
           `Macro: ${breakdown.macro.toFixed(0)}/100 (15% weight)`;
  }
}
