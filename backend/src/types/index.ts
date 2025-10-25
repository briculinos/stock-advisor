export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: string;
  volume?: string;
}

export interface StockAnalysis {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  analysis: string;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  keyPoints: string[];
  risks: string[];
  opportunities: string[];
  targetPrice?: number;
  stopLoss?: number;
  positionType?: string;
  timeHorizonDays?: number;
  thesisInvalidation?: string;
  dataGaps?: string[];
  analyst: string;
  timestamp: Date;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

export interface StockResearchData {
  symbol: string;
  companyName?: string;
  industry?: string;
  currentPrice: number;
  currency: string;
  lastUpdated?: string;
  news: NewsItem[];
  earnings?: {
    quarter: string;
    eps: number;
    revenue: string;
    date: string;
  };
  forecast?: string;
  sectorPerformance?: string;
  shortInterest?: string;
  insiderActivity?: string;
  debtToEbitda?: string;
  cashRunway?: string;
  macroScore?: string;
}

export interface PortfolioItem {
  symbol: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
}
