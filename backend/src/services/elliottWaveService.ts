import axios from 'axios';

interface PricePoint {
  date: string;
  price: number;
  timestamp: number;
}

interface Wave {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  type: 'impulse' | 'correction';
  label: string;
}

interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

interface ElliottWaveAnalysis {
  symbol: string;
  priceData: PricePoint[];
  waves: Wave[];
  fibonacciLevels: FibonacciLevel[];
  currentWave: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  prediction: string;
  analysis: string;
  waveLabel?: string;
  fibLevel?: number;
  confidence?: number;
  atr?: number;
}

export class ElliottWaveService {
  /**
   * Fetch historical price data from Yahoo Finance
   * Using daily candles with 1-month period for swing trading
   */
  async fetchHistoricalData(symbol: string, period: string = '1mo'): Promise<PricePoint[]> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${period}&interval=1d`;
      const response = await axios.get(url);

      const result = response.data?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const prices = result?.indicators?.quote?.[0]?.close || [];

      const priceData: PricePoint[] = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          price: prices[index] || 0,
          timestamp: timestamp
        }))
        .filter((point: PricePoint) => point.price > 0);

      return priceData;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw new Error('Failed to fetch historical data');
    }
  }

  /**
   * Detect pivot points (local maxima and minima)
   * Using 3-day window for daily trading
   */
  private detectPivots(priceData: PricePoint[], window: number = 3): number[] {
    const pivots: number[] = [];

    for (let i = window; i < priceData.length - window; i++) {
      const current = priceData[i].price;
      let isMaxima = true;
      let isMinima = true;

      // Check if current point is a local maximum or minimum
      for (let j = 1; j <= window; j++) {
        if (priceData[i - j].price >= current || priceData[i + j].price >= current) {
          isMaxima = false;
        }
        if (priceData[i - j].price <= current || priceData[i + j].price <= current) {
          isMinima = false;
        }
      }

      if (isMaxima || isMinima) {
        pivots.push(i);
      }
    }

    return pivots;
  }

  /**
   * Identify Elliott Wave pattern (improved version)
   * Analyzes actual price movements to determine wave position
   */
  private identifyWaves(priceData: PricePoint[], pivots: number[]): Wave[] {
    const waves: Wave[] = [];

    if (pivots.length < 3) {
      // Not enough pivots to form a wave pattern
      return waves;
    }

    // Get recent pivots (at least 5, up to 10)
    const numPivots = Math.min(10, Math.max(5, pivots.length));
    const recentPivots = pivots.slice(-numPivots);

    // Analyze price movements to determine if we're in impulse or correction
    const overallTrend = this.detectOverallTrend(priceData, recentPivots);

    // Create waves from pivots
    for (let i = 0; i < recentPivots.length - 1; i++) {
      const startIdx = recentPivots[i];
      const endIdx = recentPivots[i + 1];
      const startPrice = priceData[startIdx].price;
      const endPrice = priceData[endIdx].price;

      const isUpward = endPrice > startPrice;
      const priceChange = Math.abs(endPrice - startPrice);
      const percentChange = (priceChange / startPrice) * 100;

      waves.push({
        startIndex: startIdx,
        endIndex: endIdx,
        startPrice,
        endPrice,
        type: 'impulse', // Will be updated by determineWaveLabels
        label: 'Unknown' // Will be updated by determineWaveLabels
      });
    }

    // Determine wave labels based on price pattern analysis
    this.determineWaveLabels(waves, priceData, overallTrend);

    return waves;
  }

  /**
   * Detect overall trend direction
   */
  private detectOverallTrend(priceData: PricePoint[], pivots: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (pivots.length < 2) return 'neutral';

    const firstPivot = priceData[pivots[0]].price;
    const lastPivot = priceData[pivots[pivots.length - 1]].price;
    const currentPrice = priceData[priceData.length - 1].price;

    // Calculate overall price change
    const overallChange = ((currentPrice - firstPivot) / firstPivot) * 100;

    // Count upward vs downward swings
    let upSwings = 0;
    let downSwings = 0;

    for (let i = 0; i < pivots.length - 1; i++) {
      const startPrice = priceData[pivots[i]].price;
      const endPrice = priceData[pivots[i + 1]].price;

      if (endPrice > startPrice) {
        upSwings++;
      } else {
        downSwings++;
      }
    }

    // Determine trend based on overall change and swing direction
    if (overallChange > 5 && upSwings > downSwings) {
      return 'bullish';
    } else if (overallChange < -5 && downSwings > upSwings) {
      return 'bearish';
    } else {
      return 'neutral';
    }
  }

  /**
   * Determine wave labels based on price patterns
   */
  private determineWaveLabels(waves: Wave[], priceData: PricePoint[], trend: 'bullish' | 'bearish' | 'neutral'): void {
    if (waves.length === 0) return;

    // Analyze recent price movements to determine wave position
    const recentWaves = waves.slice(-5); // Focus on last 5 waves

    // Check if we're likely in an impulse sequence or correction
    const strongUpwardMoves = recentWaves.filter(w => w.endPrice > w.startPrice &&
      ((w.endPrice - w.startPrice) / w.startPrice) > 0.03).length;
    const strongDownwardMoves = recentWaves.filter(w => w.endPrice < w.startPrice &&
      ((w.startPrice - w.endPrice) / w.startPrice) > 0.03).length;

    // Determine if we're in impulse (1-5) or correction (A-B-C)
    const isInImpulse = trend === 'bullish' && strongUpwardMoves >= 2;
    const isInCorrection = trend === 'bearish' || (trend === 'neutral' && strongDownwardMoves >= 2);

    if (isInImpulse) {
      // Label as impulse waves (1, 2, 3, 4, 5)
      this.labelImpulseWaves(waves);
    } else if (isInCorrection) {
      // Label as corrective waves (A, B, C)
      this.labelCorrectiveWaves(waves);
    } else {
      // Mixed/transitional - use heuristics
      this.labelMixedWaves(waves, priceData);
    }
  }

  /**
   * Label waves as impulse sequence (1-5)
   */
  private labelImpulseWaves(waves: Wave[]): void {
    const impulseLabels = ['1', '2', '3', '4', '5'];
    const startIndex = Math.max(0, waves.length - 5);

    for (let i = startIndex; i < waves.length; i++) {
      const labelIndex = (i - startIndex) % 5;
      waves[i].label = impulseLabels[labelIndex];
      waves[i].type = 'impulse';
    }
  }

  /**
   * Label waves as corrective sequence (A-B-C)
   */
  private labelCorrectiveWaves(waves: Wave[]): void {
    const correctionLabels = ['A', 'B', 'C'];
    const startIndex = Math.max(0, waves.length - 3);

    for (let i = startIndex; i < waves.length; i++) {
      const labelIndex = (i - startIndex) % 3;
      waves[i].label = correctionLabels[labelIndex];
      waves[i].type = 'correction';
    }
  }

  /**
   * Label waves in mixed/transitional scenarios
   */
  private labelMixedWaves(waves: Wave[], priceData: PricePoint[]): void {
    // Analyze the last few waves to determine position
    const lastWave = waves[waves.length - 1];
    const currentPrice = priceData[priceData.length - 1].price;

    // Check if recent movement is upward or downward
    const recentChange = currentPrice - lastWave.startPrice;
    const isUpward = recentChange > 0;

    // Default to middle of impulse sequence for bullish, or correction for bearish
    if (isUpward) {
      waves[waves.length - 1].label = '3';
      waves[waves.length - 1].type = 'impulse';
    } else {
      waves[waves.length - 1].label = 'A';
      waves[waves.length - 1].type = 'correction';
    }

    // Label previous waves backward
    const impulseLabels = ['1', '2', '3', '4', '5'];
    const correctionLabels = ['A', 'B', 'C'];

    for (let i = waves.length - 2; i >= Math.max(0, waves.length - 5); i--) {
      if (isUpward) {
        const labelIndex = (3 - (waves.length - 1 - i)) % 5;
        waves[i].label = impulseLabels[Math.max(0, labelIndex)];
        waves[i].type = 'impulse';
      } else {
        const labelIndex = (0 - (waves.length - 1 - i)) % 3;
        waves[i].label = correctionLabels[Math.max(0, labelIndex)];
        waves[i].type = 'correction';
      }
    }
  }

  /**
   * Calculate Fibonacci retracement levels
   */
  private calculateFibonacciLevels(high: number, low: number): FibonacciLevel[] {
    const diff = high - low;
    const levels = [
      { ratio: 0, label: '0% (High)' },
      { ratio: 0.236, label: '23.6%' },
      { ratio: 0.382, label: '38.2%' },
      { ratio: 0.5, label: '50%' },
      { ratio: 0.618, label: '61.8%' },
      { ratio: 0.786, label: '78.6%' },
      { ratio: 1, label: '100% (Low)' }
    ];

    return levels.map(({ ratio, label }) => ({
      level: ratio,
      price: high - (diff * ratio),
      label
    }));
  }

  /**
   * Calculate Average True Range (ATR) for volatility-normalized thresholds
   */
  private calculateATR(priceData: PricePoint[], period: number = 14): number {
    if (priceData.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < priceData.length; i++) {
      const high = priceData[i].price;
      const low = priceData[i].price;
      const prevClose = priceData[i - 1].price;

      // True Range = max(high - low, |high - prevClose|, |low - prevClose|)
      // Simplified for daily close prices: just use price volatility
      const tr = Math.abs(high - prevClose);
      trueRanges.push(tr);
    }

    // Take last N periods for ATR
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / period;

    return atr;
  }

  /**
   * Find nearest Fibonacci level to current price
   */
  private findNearestFibLevel(currentPrice: number, fibLevels: FibonacciLevel[]): number {
    let nearestLevel = 0.5;
    let minDistance = Infinity;

    fibLevels.forEach(fib => {
      const distance = Math.abs(currentPrice - fib.price);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = fib.level;
      }
    });

    return nearestLevel;
  }

  /**
   * Calculate confidence score based on pattern clarity and Fibonacci accuracy
   */
  private calculateConfidence(
    waves: Wave[],
    currentPrice: number,
    fibLevels: FibonacciLevel[],
    atr: number
  ): number {
    let confidence = 50; // Base confidence

    if (waves.length === 0) return 30;

    // 1. Pattern clarity bonus (+30 max)
    // More identified waves = clearer pattern
    const waveCountBonus = Math.min(30, waves.length * 5);
    confidence += waveCountBonus;

    // 2. Fibonacci alignment bonus (+20 max)
    const nearestFib = this.findNearestFibLevel(currentPrice, fibLevels);
    const fibProximity = fibLevels.find(f => f.level === nearestFib);

    if (fibProximity) {
      const distanceToFib = Math.abs(currentPrice - fibProximity.price);
      const relativeDistance = atr > 0 ? distanceToFib / atr : 0;

      // Close to Fibonacci level = higher confidence
      if (relativeDistance < 0.5) {
        confidence += 20;
      } else if (relativeDistance < 1.0) {
        confidence += 10;
      } else if (relativeDistance < 2.0) {
        confidence += 5;
      }
    }

    // 3. Wave consistency penalty
    const lastWave = waves[waves.length - 1];
    const waveStrength = Math.abs(lastWave.endPrice - lastWave.startPrice) / lastWave.startPrice;

    // Weak waves reduce confidence
    if (waveStrength < 0.02) {
      confidence -= 15;
    }

    // Clamp between 30-95
    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * Analyze Elliott Wave pattern and provide insights
   */
  async analyzeElliottWave(symbol: string, sentimentScore?: number, macroScore?: number): Promise<ElliottWaveAnalysis> {
    try {
      // Fetch historical data (1 month with 4h candles for daily/swing trading)
      const priceData = await this.fetchHistoricalData(symbol, '1mo');

      if (priceData.length < 30) {
        throw new Error('Insufficient data for Elliott Wave analysis');
      }

      // Calculate ATR for volatility-normalized thresholds
      const atr = this.calculateATR(priceData, 14);

      // Detect pivot points (3-day window for swing trading)
      const pivots = this.detectPivots(priceData, 3);

      // Identify waves
      const waves = this.identifyWaves(priceData, pivots);

      // Calculate Fibonacci levels based on recent high and low (20 days for swing trading)
      const recentPrices = priceData.slice(-20).map(p => p.price);
      const recentHigh = Math.max(...recentPrices);
      const recentLow = Math.min(...recentPrices);
      const fibonacciLevels = this.calculateFibonacciLevels(recentHigh, recentLow);

      // Get current price
      const currentPrice = priceData[priceData.length - 1].price;

      // Determine current wave
      const currentWave = waves.length > 0 ? waves[waves.length - 1].label : 'Unknown';

      // Find nearest Fibonacci level
      const fibLevel = this.findNearestFibLevel(currentPrice, fibonacciLevels);

      // Calculate confidence score
      const confidence = this.calculateConfidence(waves, currentPrice, fibonacciLevels, atr);

      // Generate recommendation based on Elliott Wave theory with ATR
      const recommendation = this.generateRecommendation(
        waves,
        priceData,
        currentWave,
        atr,
        sentimentScore,
        macroScore
      );

      // Generate prediction based on Elliott Wave theory
      const prediction = this.generatePrediction(waves, priceData);

      // Generate analysis
      const analysis = this.generateAnalysis(symbol, waves, fibonacciLevels, currentWave);

      return {
        symbol,
        priceData,
        waves,
        fibonacciLevels,
        currentWave,
        recommendation,
        prediction,
        analysis,
        waveLabel: currentWave,
        fibLevel,
        confidence,
        atr
      };
    } catch (error) {
      console.error('Error analyzing Elliott Wave:', error);
      throw error;
    }
  }

  /**
   * Generate Buy/Sell/Hold recommendation based on Elliott Wave with ATR-based thresholds
   */
  private generateRecommendation(
    waves: Wave[],
    priceData: PricePoint[],
    currentWave: string,
    atr: number,
    sentimentScore?: number,
    macroScore?: number
  ): 'BUY' | 'SELL' | 'HOLD' {
    if (waves.length === 0) {
      return 'HOLD';
    }

    const lastWave = waves[waves.length - 1];
    const currentPrice = priceData[priceData.length - 1].price;

    // Calculate recent price movement in absolute terms
    const recentData = priceData.slice(-10);
    const priceChange = recentData[recentData.length - 1].price - recentData[0].price;
    const absoluteChange = Math.abs(priceChange);

    // Elliott Wave based recommendations with ATR-based thresholds
    if (lastWave.type === 'impulse') {
      // Wave 1, 3 → BUY (early impulse)
      if (['1', '3'].includes(lastWave.label)) {
        return 'BUY';
      }

      // Wave 5 → SELL (end of impulse)
      else if (lastWave.label === '5') {
        return 'SELL';
      }

      // Wave 2, 4 → BUY if pullback ≥1.2×ATR but <2.5×ATR
      else if (['2', '4'].includes(lastWave.label)) {
        if (atr > 0) {
          const pullback = Math.abs(lastWave.endPrice - lastWave.startPrice);

          // Check if pullback is within ATR range
          if (pullback >= 1.2 * atr && pullback < 2.5 * atr) {
            return 'BUY';
          } else if (pullback >= 2.5 * atr) {
            return 'HOLD'; // Too much volatility, wait for stabilization
          }
        }

        // Fallback: use price change if ATR is not available
        return priceChange < 0 ? 'BUY' : 'HOLD';
      }
    } else {
      // Corrective waves (A, B, C)

      // Wave A → HOLD (correction start)
      if (lastWave.label === 'A') {
        return 'HOLD';
      }

      // Wave B → SELL only if sentiment negative or macro bearish
      else if (lastWave.label === 'B') {
        const sentimentNegative = sentimentScore !== undefined && sentimentScore < 40;
        const macroBearish = macroScore !== undefined && macroScore < 40;

        if (sentimentNegative || macroBearish) {
          return 'SELL';
        }

        return 'HOLD'; // Don't sell if sentiment/macro are neutral or positive
      }

      // Wave C → BUY if drop ≥1.5×ATR and sentiment improving
      else if (lastWave.label === 'C') {
        const drop = Math.abs(lastWave.endPrice - lastWave.startPrice);
        const sentimentImproving = sentimentScore !== undefined && sentimentScore >= 50;

        if (atr > 0) {
          // Check if drop is significant enough (≥1.5×ATR) and sentiment is improving
          if (drop >= 1.5 * atr && sentimentImproving) {
            return 'BUY';
          } else if (drop >= 1.5 * atr) {
            return 'HOLD'; // Significant drop but sentiment not improving yet
          }
        }

        // Fallback: use price change if ATR is not available
        return priceChange < 0 && sentimentImproving ? 'BUY' : 'HOLD';
      }
    }

    return 'HOLD'; // Default to hold if uncertain
  }

  /**
   * Generate prediction based on current wave
   */
  private generatePrediction(waves: Wave[], priceData: PricePoint[]): string {
    if (waves.length === 0) {
      return 'Insufficient data for prediction';
    }

    const lastWave = waves[waves.length - 1];
    const currentPrice = priceData[priceData.length - 1].price;

    // Predictions based on specific wave positions
    switch (lastWave.label) {
      case '1':
        return 'Wave 1 complete - expect pullback in Wave 2, then strong rally in Wave 3';
      case '2':
        return 'Wave 2 pullback - watching for Wave 3 rally (typically strongest move)';
      case '3':
        return 'Wave 3 in progress - strong upward momentum expected to continue';
      case '4':
        return 'Wave 4 consolidation - preparing for final Wave 5 push higher';
      case '5':
        return 'Wave 5 (final impulse) - approaching trend exhaustion, prepare for correction';
      case 'A':
        return 'Wave A correction started - expect counter-trend bounce in Wave B';
      case 'B':
        return 'Wave B bounce (often a bull trap) - watching for Wave C decline';
      case 'C':
        return 'Wave C decline - correction nearing completion, reversal possible';
      default:
        if (lastWave.type === 'impulse') {
          return 'Upward momentum expected in impulse wave';
        } else {
          return 'Correction phase - exercise caution';
        }
    }
  }

  /**
   * Generate detailed analysis
   */
  private generateAnalysis(
    symbol: string,
    waves: Wave[],
    fibLevels: FibonacciLevel[],
    currentWave: string
  ): string {
    const wave5 = waves.find(w => w.label === '5');
    const waveC = waves.find(w => w.label === 'C');

    let analysis = `Elliott Wave Analysis for ${symbol}:\n\n`;

    analysis += `Current Wave: ${currentWave}\n`;
    analysis += `Total Identified Waves: ${waves.length}\n\n`;

    if (wave5) {
      analysis += `Wave 5 detected - potentially reaching end of impulse sequence. `;
      analysis += `Consider taking profits or preparing for correction.\n\n`;
    }

    if (waveC) {
      analysis += `Wave C detected - correction may be completing. `;
      analysis += `Watch for reversal signals.\n\n`;
    }

    analysis += `Key Fibonacci Levels:\n`;
    const keyLevels = fibLevels.filter(l => [0.382, 0.5, 0.618].includes(l.level));
    keyLevels.forEach(level => {
      analysis += `${level.label}: $${level.price.toFixed(2)}\n`;
    });

    return analysis;
  }
}
