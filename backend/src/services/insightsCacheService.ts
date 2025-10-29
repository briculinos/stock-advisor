import fs from 'fs';
import path from 'path';

// CommonJS globals
declare const __dirname: string;

interface CachedInsight {
  symbol: string;
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
  confidence: number;
  compositeScore: number;
  timestamp: number;
  data: any; // Full insights data
}

interface InsightsCache {
  [symbol: string]: CachedInsight;
}

export class InsightsCacheService {
  private cacheFilePath: string;
  private cache: InsightsCache;

  constructor() {
    this.cacheFilePath = path.join(__dirname, '../../data/insights-cache.json');
    this.cache = this.loadCache();
  }

  private loadCache(): InsightsCache {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading insights cache:', error);
    }
    return {};
  }

  private saveCache(): void {
    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving insights cache:', error);
    }
  }

  public getCachedInsight(symbol: string): CachedInsight | null {
    // Reload cache from file to get latest data
    this.cache = this.loadCache();

    const cached = this.cache[symbol.toUpperCase()];
    if (!cached) {
      return null;
    }

    // Check if cache is still valid (15 minutes = 900000 ms)
    const now = Date.now();
    const age = now - cached.timestamp;
    const maxAge = 15 * 60 * 1000; // 15 minutes

    if (age > maxAge) {
      // Cache expired
      return null;
    }

    return cached;
  }

  public setCachedInsight(symbol: string, insight: any): void {
    const cachedInsight: CachedInsight = {
      symbol: symbol.toUpperCase(),
      recommendation: insight.recommendation,
      confidence: insight.confidence,
      compositeScore: insight.compositeScore,
      timestamp: Date.now(),
      data: insight
    };

    this.cache[symbol.toUpperCase()] = cachedInsight;
    this.saveCache();
  }

  public getAllCachedSymbols(): string[] {
    return Object.keys(this.cache);
  }

  public getStaleSymbols(): string[] {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    return Object.keys(this.cache).filter(symbol => {
      const age = now - this.cache[symbol].timestamp;
      return age > maxAge;
    });
  }

  public clearCache(): void {
    this.cache = {};
    this.saveCache();
  }

  public removeSymbol(symbol: string): void {
    delete this.cache[symbol.toUpperCase()];
    this.saveCache();
  }

  public getAllValidInsights(): InsightsCache {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes
    const validCache: InsightsCache = {};

    Object.keys(this.cache).forEach(symbol => {
      const age = now - this.cache[symbol].timestamp;
      if (age <= maxAge) {
        validCache[symbol] = this.cache[symbol];
      }
    });

    return validCache;
  }
}
