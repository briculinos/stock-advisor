import axios from 'axios';

interface MacroIndicators {
  inflationRate: number;
  yieldSpread: number; // 10Y - 2Y Treasury spread
  vixLevel: number;
  regime: 'bullish' | 'bearish' | 'volatile';
  confidence: number;

  // Enhanced fields
  macroRegime: string; // Same as regime, for output compatibility
  vix: number; // Same as vixLevel, for output compatibility
  sectorTailwind?: number; // Sector-specific adjustment based on yield curve
  macroScore?: number; // Calculated score
  realizedVol?: number; // 10-day realized volatility
}

export class MacroAnalysisService {
  /**
   * Analyze macro economic conditions with sector overlay
   */
  async analyzeMacroConditions(industry?: string): Promise<MacroIndicators> {
    try {
      // Fetch VIX (volatility index) and realized volatility
      const vixData = await this.fetchVIX();
      const vixLevel = vixData.vix;

      // Fetch yield spread (10Y - 2Y)
      const yieldSpread = await this.fetchYieldSpread();

      // Calculate realized 10-day volatility (for SPY as proxy)
      const realizedVol = await this.calculateRealizedVolatility();

      // Determine market regime based on VIX
      let regime: 'bullish' | 'bearish' | 'volatile';
      let confidence: number;

      if (vixLevel < 15) {
        regime = 'bullish';
        confidence = 85;
      } else if (vixLevel > 30) {
        regime = 'bearish';
        confidence = 75;
      } else {
        regime = 'volatile';
        confidence = 60;
      }

      // Confidence downscaling if realized vol > implied VIX by >25%
      if (realizedVol > vixLevel * 1.25) {
        confidence = Math.max(30, confidence * 0.75); // Reduce confidence by 25%
      }

      // Calculate sector tailwind based on yield curve
      const sectorTailwind = this.calculateSectorTailwind(industry, yieldSpread);

      return {
        inflationRate: 3.2, // Placeholder - would come from FRED API
        yieldSpread,
        vixLevel,
        regime,
        confidence,
        macroRegime: regime,
        vix: vixLevel,
        sectorTailwind,
        realizedVol
      };
    } catch (error) {
      console.error('Error analyzing macro conditions:', error);
      // Return neutral defaults
      return {
        inflationRate: 3.0,
        yieldSpread: 0.3,
        vixLevel: 20,
        regime: 'volatile',
        confidence: 50,
        macroRegime: 'volatile',
        vix: 20,
        sectorTailwind: 0
      };
    }
  }

  /**
   * Fetch VIX data from Yahoo Finance
   */
  private async fetchVIX(): Promise<{ vix: number }> {
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=1d';
      const response = await axios.get(url);

      const result = response.data?.chart?.result?.[0];
      const price = result?.meta?.regularMarketPrice || 20;

      return { vix: price };
    } catch (error) {
      console.error('Error fetching VIX:', error);
      return { vix: 20 }; // Default middle value
    }
  }

  /**
   * Calculate macro score (0-100) with sector tailwind
   */
  calculateMacroScore(indicators: MacroIndicators): number {
    let score = 50; // Start neutral

    // Adjust based on regime
    if (indicators.regime === 'bullish') {
      score += 30;
    } else if (indicators.regime === 'bearish') {
      score -= 30;
    }

    // Adjust based on VIX (lower is better)
    if (indicators.vixLevel < 15) {
      score += 20;
    } else if (indicators.vixLevel > 30) {
      score -= 20;
    }

    // Adjust based on yield spread (positive is better)
    if (indicators.yieldSpread > 0) {
      score += 10;
    } else {
      score -= 10;
    }

    // Add sector tailwind adjustment
    if (indicators.sectorTailwind !== undefined) {
      score += indicators.sectorTailwind;
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Fetch yield spread (10Y - 2Y Treasury)
   */
  private async fetchYieldSpread(): Promise<number> {
    try {
      // Fetch 10-year Treasury yield
      const url10Y = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=1d&interval=1d';
      const response10Y = await axios.get(url10Y);
      const yield10Y = response10Y.data?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.5;

      // Fetch 2-year Treasury yield
      const url2Y = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETYX?range=1d&interval=1d';
      const response2Y = await axios.get(url2Y);
      const yield2Y = response2Y.data?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.8;

      const spread = (yield10Y - yield2Y) / 10; // Divide by 10 to get percentage points

      return parseFloat(spread.toFixed(2));
    } catch (error) {
      console.error('Error fetching yield spread:', error);
      return 0.3; // Default positive spread
    }
  }

  /**
   * Calculate realized 10-day volatility (using SPY as proxy)
   */
  private async calculateRealizedVolatility(): Promise<number> {
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1mo&interval=1d';
      const response = await axios.get(url);

      const result = response.data?.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close || [];

      if (closes.length < 11) {
        return 20; // Default if not enough data
      }

      // Calculate daily returns for last 10 days
      const returns: number[] = [];
      const recentCloses = closes.slice(-11); // Need 11 to get 10 returns

      for (let i = 1; i < recentCloses.length; i++) {
        if (recentCloses[i] && recentCloses[i - 1]) {
          const dailyReturn = (recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1];
          returns.push(dailyReturn);
        }
      }

      if (returns.length === 0) {
        return 20;
      }

      // Calculate standard deviation of returns
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      // Annualize and convert to percentage (similar to VIX scale)
      const realizedVol = stdDev * Math.sqrt(252) * 100;

      return parseFloat(realizedVol.toFixed(2));
    } catch (error) {
      console.error('Error calculating realized volatility:', error);
      return 20; // Default middle value
    }
  }

  /**
   * Calculate sector tailwind based on yield curve
   * Cyclicals gain when curve steepens, defensives gain when flattening/inverting
   */
  private calculateSectorTailwind(industry?: string, yieldSpread?: number): number {
    if (!industry || yieldSpread === undefined) {
      return 0;
    }

    const industryLower = industry.toLowerCase();

    // Cyclical sectors (benefit from steepening curve)
    const cyclicals = [
      'technology', 'software', 'semiconductor', 'internet',
      'consumer discretionary', 'retail', 'automotive', 'travel',
      'industrials', 'manufacturing', 'construction', 'materials',
      'financials', 'banking', 'insurance'
    ];

    // Defensive sectors (benefit from flattening/inverting curve)
    const defensives = [
      'utilities', 'consumer staples', 'healthcare', 'pharmaceuticals',
      'telecom', 'real estate', 'reit'
    ];

    const isCyclical = cyclicals.some(sector => industryLower.includes(sector));
    const isDefensive = defensives.some(sector => industryLower.includes(sector));

    // Steepening curve (positive spread or becoming more positive)
    if (yieldSpread > 0.5) {
      // Steep curve favors cyclicals
      if (isCyclical) return 10;
      if (isDefensive) return -5;
    }
    // Normal curve (0 to 0.5)
    else if (yieldSpread >= 0 && yieldSpread <= 0.5) {
      // Neutral to slight cyclical favor
      if (isCyclical) return 5;
      if (isDefensive) return 0;
    }
    // Flattening curve (negative spread)
    else if (yieldSpread < 0) {
      // Flat/inverted curve favors defensives
      if (isDefensive) return 10;
      if (isCyclical) return -10;
    }

    return 0; // Neutral for unclassified sectors
  }
}
