interface PricePoint {
  date: string;
  price: number;
  timestamp: number;
}

interface SupportResistance {
  support: number[];
  resistance: number[];
  pivotPoint?: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  momentum: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  supportResistance?: SupportResistance;
  confidence: number; // Confidence in technical analysis (0-100)
}

export class TechnicalAnalysisService {
  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50; // Default neutral
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI using smoothed averages
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;

    if (prices.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // Calculate EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // MACD line
    const macd = fastEMA - slowEMA;

    // Signal line (EMA of MACD)
    // Simplified: using a basic average for signal
    const signal = macd * 0.9; // Approximation

    // Histogram
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices[prices.length - 1];
    }

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate momentum (rate of change)
   */
  calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period) {
      return 0;
    }

    const current = prices[prices.length - 1];
    const past = prices[prices.length - period];

    return ((current - past) / past) * 100;
  }

  /**
   * Calculate pivot points for support and resistance
   */
  calculatePivotPoints(priceData: PricePoint[]): { pivot: number; support: number[]; resistance: number[] } {
    if (priceData.length < 1) {
      return { pivot: 0, support: [], resistance: [] };
    }

    // Use recent data for pivot calculation
    const recent = priceData.slice(-20);
    const high = Math.max(...recent.map(p => p.price));
    const low = Math.min(...recent.map(p => p.price));
    const close = recent[recent.length - 1].price;

    // Classic Pivot Point
    const pivot = (high + low + close) / 3;

    // Support levels
    const support1 = (2 * pivot) - high;
    const support2 = pivot - (high - low);

    // Resistance levels
    const resistance1 = (2 * pivot) - low;
    const resistance2 = pivot + (high - low);

    return {
      pivot,
      support: [support1, support2].filter(s => s > 0),
      resistance: [resistance1, resistance2].filter(r => r > 0)
    };
  }

  /**
   * Find local minima and maxima for support/resistance
   */
  findLocalExtremes(priceData: PricePoint[], window: number = 5): { support: number[]; resistance: number[] } {
    if (priceData.length < window * 2) {
      return { support: [], resistance: [] };
    }

    const prices = priceData.map(p => p.price);
    const support: number[] = [];
    const resistance: number[] = [];

    // Look for local minima (support) and maxima (resistance)
    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const current = prices[i];

      // Check if local minimum (support)
      if (current === Math.min(...slice)) {
        support.push(current);
      }

      // Check if local maximum (resistance)
      if (current === Math.max(...slice)) {
        resistance.push(current);
      }
    }

    // Cluster similar levels (within 2% of each other)
    const clusterLevels = (levels: number[]): number[] => {
      if (levels.length === 0) return [];

      const sorted = [...levels].sort((a, b) => a - b);
      const clustered: number[] = [];
      let currentCluster = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.abs(sorted[i] - sorted[i - 1]) / sorted[i - 1];
        if (diff < 0.02) {
          currentCluster.push(sorted[i]);
        } else {
          clustered.push(currentCluster.reduce((a, b) => a + b) / currentCluster.length);
          currentCluster = [sorted[i]];
        }
      }
      clustered.push(currentCluster.reduce((a, b) => a + b) / currentCluster.length);

      return clustered;
    };

    return {
      support: clusterLevels(support).slice(-3), // Keep top 3 support levels
      resistance: clusterLevels(resistance).slice(-3) // Keep top 3 resistance levels
    };
  }

  /**
   * Calculate support and resistance levels
   */
  calculateSupportResistance(priceData: PricePoint[]): SupportResistance {
    // Get pivot-based levels
    const pivotLevels = this.calculatePivotPoints(priceData);

    // Get historical extremes
    const extremes = this.findLocalExtremes(priceData);

    // Combine and deduplicate
    const allSupport = [...pivotLevels.support, ...extremes.support];
    const allResistance = [...pivotLevels.resistance, ...extremes.resistance];

    // Sort and take most relevant levels
    const support = [...new Set(allSupport)]
      .sort((a, b) => b - a) // Descending order
      .slice(0, 3); // Top 3 closest support levels

    const resistance = [...new Set(allResistance)]
      .sort((a, b) => a - b) // Ascending order
      .slice(0, 3); // Top 3 closest resistance levels

    return {
      support,
      resistance,
      pivotPoint: pivotLevels.pivot
    };
  }

  /**
   * Analyze all technical indicators
   */
  analyzeTechnical(priceData: PricePoint[]): TechnicalIndicators {
    const prices = priceData.map(p => p.price);

    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const momentum = this.calculateMomentum(prices);
    const supportResistance = this.calculateSupportResistance(priceData);

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral';

    if (rsi > 60 && macd.histogram > 0 && momentum > 0) {
      trend = 'bullish';
    } else if (rsi < 40 && macd.histogram < 0 && momentum < 0) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }

    // Calculate confidence based on data quality and signal strength
    let confidence = 50; // Start neutral

    // More data points = higher confidence (up to +25)
    if (priceData.length >= 90) {
      confidence += 25; // 3+ months of data
    } else if (priceData.length >= 60) {
      confidence += 20; // 2-3 months of data
    } else if (priceData.length >= 30) {
      confidence += 15; // 1-2 months of data
    } else {
      confidence += 5; // Less than 1 month
    }

    // Signal alignment increases confidence (up to +25)
    let signalsAligned = 0;
    if ((trend === 'bullish' && rsi > 50) || (trend === 'bearish' && rsi < 50)) signalsAligned++;
    if ((trend === 'bullish' && macd.histogram > 0) || (trend === 'bearish' && macd.histogram < 0)) signalsAligned++;
    if ((trend === 'bullish' && momentum > 0) || (trend === 'bearish' && momentum < 0)) signalsAligned++;

    confidence += (signalsAligned / 3) * 25;

    // Clamp between 30-95
    confidence = Math.max(30, Math.min(95, confidence));

    return {
      rsi,
      macd,
      momentum,
      trend,
      supportResistance,
      confidence
    };
  }

  /**
   * Calculate technical score (0-100)
   */
  calculateTechnicalScore(indicators: TechnicalIndicators, currentPrice?: number): number {
    let score = 50; // Start neutral

    // RSI scoring (optimal range: 30-70)
    if (indicators.rsi > 70) {
      score -= 20; // Overbought
    } else if (indicators.rsi < 30) {
      score += 20; // Oversold (potential buy)
    } else if (indicators.rsi >= 50 && indicators.rsi <= 60) {
      score += 15; // Healthy bullish
    }

    // MACD scoring
    if (indicators.macd.histogram > 0) {
      score += 15; // Bullish crossover
    } else {
      score -= 15; // Bearish
    }

    // Momentum scoring
    if (indicators.momentum > 5) {
      score += 15; // Strong upward momentum
    } else if (indicators.momentum < -5) {
      score -= 15; // Strong downward momentum
    }

    // Support/Resistance scoring
    if (indicators.supportResistance && currentPrice) {
      const { support, resistance } = indicators.supportResistance;

      // Check if near support (bullish)
      const nearSupport = support.some(s => {
        const diff = Math.abs(currentPrice - s) / currentPrice;
        return diff < 0.03; // Within 3%
      });

      // Check if near resistance (bearish)
      const nearResistance = resistance.some(r => {
        const diff = Math.abs(currentPrice - r) / currentPrice;
        return diff < 0.03; // Within 3%
      });

      if (nearSupport && !nearResistance) {
        score += 10; // Price near support is bullish
      } else if (nearResistance && !nearSupport) {
        score -= 10; // Price near resistance is bearish
      }

      // Check if price broke through resistance (very bullish)
      const brokeThroughResistance = resistance.some(r => currentPrice > r && (currentPrice - r) / r < 0.05);
      if (brokeThroughResistance) {
        score += 15; // Breakout above resistance
      }

      // Check if price fell below support (very bearish)
      const fellBelowSupport = support.some(s => currentPrice < s && (s - currentPrice) / s < 0.05);
      if (fellBelowSupport) {
        score -= 15; // Breakdown below support
      }
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }
}
