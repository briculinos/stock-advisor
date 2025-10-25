import axios from 'axios';

export class ExchangeRateService {
  private baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private cache: Map<string, { rates: Record<string, number>; timestamp: number }> = new Map();
  private cacheExpiry = 3600000; // 1 hour in milliseconds

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    try {
      // Check cache first
      const cached = this.cache.get(fromCurrency);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < this.cacheExpiry) {
        return cached.rates[toCurrency] || 1;
      }

      // Fetch fresh rates
      const response = await axios.get(`${this.baseUrl}/${fromCurrency}`);
      const rates = response.data.rates;

      // Cache the result
      this.cache.set(fromCurrency, {
        rates,
        timestamp: now
      });

      return rates[toCurrency] || 1;
    } catch (error) {
      console.error(`Error fetching exchange rate from ${fromCurrency} to ${toCurrency}:`, error);
      return 1; // Fallback to 1:1 if API fails
    }
  }

  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }
}
