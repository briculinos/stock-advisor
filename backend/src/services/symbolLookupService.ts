import axios from 'axios';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export class SymbolLookupService {
  /**
   * Search for stock symbols by company name
   */
  async searchSymbol(query: string): Promise<SearchResult[]> {
    try {
      // Use Yahoo Finance search endpoint
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const quotes = response.data?.quotes || [];

      // Filter and map results
      const results: SearchResult[] = quotes
        .filter((quote: any) => quote.symbol && quote.longname)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || '',
          exchange: quote.exchange || ''
        }))
        .slice(0, 5); // Return top 5 results

      return results;
    } catch (error) {
      console.error('Error searching for symbol:', error);
      return [];
    }
  }

  /**
   * Get the best match symbol for a company name
   */
  async getBestMatch(companyName: string): Promise<string | null> {
    const results = await this.searchSymbol(companyName);

    if (results.length === 0) {
      return null;
    }

    // Return the first (most relevant) result
    return results[0].symbol;
  }
}
