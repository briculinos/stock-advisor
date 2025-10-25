import axios from 'axios';
import { StockAnalysis, StockResearchData, PortfolioItem } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses (unauthorized) - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token is invalid or expired
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const analyzeStock = async (symbol: string, companyName?: string) => {
  const response = await api.post<{
    research: StockResearchData;
    analysis: StockAnalysis;
  }>('/api/stock/analyze', {
    symbol,
    companyName,
  });
  return response.data;
};

export const getPortfolio = async (): Promise<PortfolioItem[]> => {
  const response = await api.get<PortfolioItem[]>('/api/stock/portfolio');
  return response.data;
};

export const addToPortfolio = async (item: Omit<PortfolioItem, 'currentPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercent'>) => {
  const response = await api.post<PortfolioItem>('/api/stock/portfolio', item);
  return response.data;
};

export const removeFromPortfolio = async (symbol: string) => {
  const response = await api.delete(`/api/stock/portfolio/${symbol}`);
  return response.data;
};

export const getQuickPrices = async (symbols: string[]): Promise<Record<string, { price: number; currency: string; priceInSEK: number; lastUpdated?: string }>> => {
  const response = await api.post<Record<string, { price: number; currency: string; priceInSEK: number; lastUpdated?: string }>>('/api/stock/quick-prices', {
    symbols,
  });
  return response.data;
};

export const getElliottWaveAnalysis = async (symbol: string) => {
  const response = await api.get(`/api/stock/elliott-wave/${symbol}`);
  return response.data;
};

export const getEnhancedInsights = async (symbol: string, companyName?: string) => {
  const response = await api.post('/api/stock/enhanced-insights', {
    symbol,
    companyName,
  });
  return response.data;
};

export const searchSymbol = async (query: string) => {
  const response = await api.get(`/api/stock/search-symbol?query=${encodeURIComponent(query)}`);
  return response.data;
};

export const getQuickPrice = async (symbol: string): Promise<{ price: number; currency: string }> => {
  const response = await api.get<{ price: number; currency: string }>(`/api/stock/quick-price/${symbol}`);
  return response.data;
};

export const getExchangeRateToSEK = async (currency: string): Promise<number> => {
  const response = await api.get<{ rate: number }>(`/api/stock/exchange-rate/${currency}`);
  return response.data.rate;
};

export const getMoonshotCandidates = async () => {
  const response = await api.get('/api/stock/moonshots');
  return response.data.candidates;
};
