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
}

export interface PortfolioItem {
  symbol: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  currency?: string;
  totalValue?: number;
  totalValueInSEK?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  lastUpdated?: string;
}
