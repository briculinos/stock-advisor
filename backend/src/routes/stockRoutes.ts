import { Router, Request, Response } from 'express';
import axios from 'axios';
import { StockResearchService } from '../services/stockResearchService.js';
import { AIAnalysisService } from '../services/aiAnalysisService.js';
import { ExchangeRateService } from '../services/exchangeRateService.js';
import { ElliottWaveService } from '../services/elliottWaveService.js';
import { EnhancedInsightsService } from '../services/enhancedInsightsService.js';
import { SymbolLookupService } from '../services/symbolLookupService.js';
import { MoonshotAnalysisService } from '../services/moonshotAnalysisService.js';
import { PortfolioItem } from '../types/index.js';

const router = Router();

// Lazy initialization - services created on first use to ensure env vars are loaded
let researchService: StockResearchService | null = null;
let aiService: AIAnalysisService | null = null;
let exchangeService: ExchangeRateService | null = null;
let elliottWaveService: ElliottWaveService | null = null;
let enhancedInsightsService: EnhancedInsightsService | null = null;
let symbolLookupService: SymbolLookupService | null = null;
let moonshotService: MoonshotAnalysisService | null = null;

function getServices() {
  if (!researchService) {
    researchService = new StockResearchService();
  }
  if (!aiService) {
    aiService = new AIAnalysisService();
  }
  if (!exchangeService) {
    exchangeService = new ExchangeRateService();
  }
  if (!elliottWaveService) {
    elliottWaveService = new ElliottWaveService();
  }
  if (!enhancedInsightsService) {
    enhancedInsightsService = new EnhancedInsightsService();
  }
  if (!symbolLookupService) {
    symbolLookupService = new SymbolLookupService();
  }
  if (!moonshotService) {
    moonshotService = new MoonshotAnalysisService();
  }
  return { researchService, aiService, exchangeService, elliottWaveService, enhancedInsightsService, symbolLookupService, moonshotService };
}

// In-memory portfolio storage (in production, use a database)
let portfolio: PortfolioItem[] = [];

// Search for stock symbols by company name
router.get('/search-symbol', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log(`Searching for symbol: ${query}`);

    const { symbolLookupService } = getServices();
    const results = await symbolLookupService.searchSymbol(query);

    res.json(results);
  } catch (error) {
    console.error('Error searching for symbol:', error);
    res.status(500).json({ error: 'Failed to search for symbol' });
  }
});

// Analyze a stock
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { symbol, companyName } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    console.log(`Analyzing stock: ${symbol}`);

    const { researchService, aiService } = getServices();

    // Research the stock
    const researchData = await researchService.researchStock(symbol.toUpperCase());

    // Get AI analysis
    const analysis = await aiService.analyzeStock(
      researchData,
      companyName || symbol
    );

    res.json({
      research: researchData,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing stock:', error);
    res.status(500).json({ error: 'Failed to analyze stock' });
  }
});

// Get portfolio
router.get('/portfolio', (req: Request, res: Response) => {
  res.json(portfolio);
});

// Add to portfolio
router.post('/portfolio', (req: Request, res: Response) => {
  try {
    const { symbol, shares, purchasePrice, purchaseDate } = req.body;

    if (!symbol || !shares || !purchasePrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item: PortfolioItem = {
      symbol: symbol.toUpperCase(),
      shares: parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0]
    };

    portfolio.push(item);
    res.json(item);
  } catch (error) {
    console.error('Error adding to portfolio:', error);
    res.status(500).json({ error: 'Failed to add to portfolio' });
  }
});

// Remove from portfolio
router.delete('/portfolio/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const initialLength = portfolio.length;
  portfolio = portfolio.filter(item => item.symbol !== symbol.toUpperCase());

  if (portfolio.length < initialLength) {
    res.json({ success: true, message: 'Removed from portfolio' });
  } else {
    res.status(404).json({ error: 'Stock not found in portfolio' });
  }
});

// Quick price check for portfolio items
router.post('/quick-prices', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols must be an array' });
    }

    const { researchService, exchangeService } = getServices();

    const priceData: Record<string, { price: number; currency: string; priceInSEK: number; lastUpdated?: string }> = {};

    for (const symbol of symbols) {
      const researchData = await researchService.researchStock(symbol);

      // Convert price to SEK
      const priceInSEK = await exchangeService.convertAmount(
        researchData.currentPrice,
        researchData.currency,
        'SEK'
      );

      priceData[symbol] = {
        price: researchData.currentPrice,
        currency: researchData.currency,
        priceInSEK: priceInSEK,
        lastUpdated: researchData.lastUpdated
      };
    }

    res.json(priceData);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Get historical stock data for chart
router.get('/history/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const period = req.query.period || '3mo'; // Default 3 months

    // Fetch historical data from Yahoo Finance
    const historyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${period}&interval=1d`;
    const response = await axios.get(historyUrl);

    const result = response.data?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const prices = result?.indicators?.quote?.[0]?.close || [];

    // Format data for frontend
    const chartData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toLocaleDateString(),
      price: prices[index] || 0
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

// Get Elliott Wave analysis with Fibonacci levels
router.get('/elliott-wave/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    console.log(`Analyzing Elliott Wave for ${symbol}`);

    const { elliottWaveService } = getServices();
    const analysis = await elliottWaveService.analyzeElliottWave(symbol);

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing Elliott Wave:', error);
    res.status(500).json({ error: 'Failed to analyze Elliott Wave' });
  }
});

// Get enhanced insights (multi-source fusion analysis)
router.post('/enhanced-insights', async (req: Request, res: Response) => {
  try {
    const { symbol, companyName } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    console.log(`Generating enhanced insights for ${symbol}`);

    const { enhancedInsightsService } = getServices();
    const insights = await enhancedInsightsService.generateInsights(symbol, companyName);

    res.json(insights);
  } catch (error) {
    console.error('Error generating enhanced insights:', error);
    res.status(500).json({ error: 'Failed to generate enhanced insights' });
  }
});

// Get quick stock price (for owned stocks)
router.get('/quick-price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    console.log(`Fetching quick price for ${symbol}`);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const result = response.data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice || 0;
    const currency = result?.meta?.currency || 'USD';

    res.json({ price, currency });
  } catch (error) {
    console.error('Error fetching quick price:', error);
    res.status(500).json({ error: 'Failed to fetch stock price' });
  }
});

// Get historical stock price for a specific date
router.get('/historical-price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    console.log(`Fetching historical price for ${symbol} on ${date}`);

    // Convert date to Unix timestamp
    const targetDate = new Date(date);
    const period1 = Math.floor(targetDate.getTime() / 1000);
    const period2 = period1 + 86400; // Add one day

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const result = response.data?.chart?.result?.[0];
    const quotes = result?.indicators?.quote?.[0];
    const price = quotes?.close?.[0] || quotes?.open?.[0] || result?.meta?.regularMarketPrice || 0;

    res.json({ price });
  } catch (error) {
    console.error('Error fetching historical price:', error);
    res.status(500).json({ error: 'Failed to fetch historical price' });
  }
});

// Convert currency to SEK
router.post('/convert-to-sek', async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body;

    if (amount === undefined || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    console.log(`Converting ${amount} ${currency} to SEK`);

    const { exchangeService } = getServices();
    const amountInSEK = await exchangeService.convertAmount(
      parseFloat(amount),
      currency,
      'SEK'
    );

    res.json({ amountInSEK });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// Get exchange rate to SEK
router.get('/exchange-rate/:currency', async (req: Request, res: Response) => {
  try {
    const { currency } = req.params;

    console.log(`Fetching exchange rate for ${currency} to SEK`);

    const { exchangeService } = getServices();
    const rate = await exchangeService.getExchangeRate(currency, 'SEK');

    res.json({ rate, fromCurrency: currency, toCurrency: 'SEK' });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

// Get moonshot candidates
router.get('/moonshots', async (req: Request, res: Response) => {
  try {
    console.log('Finding moonshot candidates...');

    const { moonshotService } = getServices();
    const candidates = await moonshotService.findMoonshotCandidates(5);

    res.json({ candidates });
  } catch (error) {
    console.error('Error finding moonshots:', error);
    res.status(500).json({ error: 'Failed to find moonshot candidates' });
  }
});

export default router;
