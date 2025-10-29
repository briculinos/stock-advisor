import cron from 'node-cron';
import { InsightsCacheService } from './insightsCacheService.js';
import { UserPortfolioService } from './userPortfolioService.js';
import { EnhancedInsightsService } from './enhancedInsightsService.js';

export class InsightsCronService {
  private cacheService: InsightsCacheService;
  private portfolioService: UserPortfolioService;
  private insightsService: EnhancedInsightsService;
  private isRunning: boolean = false;

  constructor() {
    this.cacheService = new InsightsCacheService();
    this.portfolioService = new UserPortfolioService();
    this.insightsService = new EnhancedInsightsService();
  }

  public start(): void {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('🔄 Starting scheduled insights refresh...');
      await this.refreshInsights();
    });

    console.log('✅ Insights cron job started - running every 15 minutes');

    // Also run once on startup
    setTimeout(() => {
      this.refreshInsights();
    }, 5000); // Wait 5 seconds after server start
  }

  public async refreshInsights(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️  Insights refresh already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Get all unique symbols from all user portfolios
      const symbols = this.portfolioService.getAllUniqueSymbols();

      if (symbols.length === 0) {
        console.log('📭 No stocks to analyze');
        return;
      }

      console.log(`📊 Refreshing insights for ${symbols.length} stocks: ${symbols.join(', ')}`);

      let successCount = 0;
      let errorCount = 0;

      // Process stocks sequentially to avoid rate limits
      for (const symbol of symbols) {
        try {
          // Check if we have a recent cache
          const cached = this.cacheService.getCachedInsight(symbol);
          if (cached) {
            console.log(`✓ ${symbol}: Using valid cache (${Math.round((Date.now() - cached.timestamp) / 1000 / 60)} min old)`);
            continue;
          }

          // Generate fresh insights
          console.log(`🔍 ${symbol}: Generating insights...`);
          const insights = await this.insightsService.generateInsights(symbol, '');

          // Cache the results
          this.cacheService.setCachedInsight(symbol, insights);

          console.log(`✓ ${symbol}: Cached with recommendation ${insights.recommendation}`);
          successCount++;

          // Add a small delay between requests to avoid overwhelming APIs
          await this.delay(2000); // 2 second delay
        } catch (error) {
          console.error(`✗ ${symbol}: Error generating insights:`, error);
          errorCount++;
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ Insights refresh complete: ${successCount} success, ${errorCount} errors (${duration}s)`);
    } catch (error) {
      console.error('Error in insights refresh cron:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async refreshSingleSymbol(symbol: string): Promise<void> {
    try {
      console.log(`🔍 Manually refreshing ${symbol}...`);
      const insights = await this.insightsService.generateInsights(symbol, '');
      this.cacheService.setCachedInsight(symbol, insights);
      console.log(`✓ ${symbol}: Cached with recommendation ${insights.recommendation}`);
    } catch (error) {
      console.error(`✗ ${symbol}: Error generating insights:`, error);
      throw error;
    }
  }
}
