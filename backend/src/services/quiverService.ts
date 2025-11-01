import axios from 'axios';

export interface CongressionalTrade {
  representative: string;
  transaction: 'Purchase' | 'Sale';
  amount: string;
  date: string;
  party?: string;
}

export interface InsiderTrade {
  filingDate: string;
  tradeDate: string;
  insider: string;
  title: string;
  transaction: string;
  shares: number;
  value?: number;
}

export interface RedditMention {
  date: string;
  mentions: number;
  sentiment?: number; // If available
  rank?: number;
}

export interface LobbyingActivity {
  client: string;
  amount: number;
  year: number;
  issue?: string;
}

export interface QuiverData {
  congressionalTrades: CongressionalTrade[];
  insiderTrades: InsiderTrade[];
  redditMentions: RedditMention[];
  lobbyingActivity: LobbyingActivity[];
  summary: {
    recentCongressionalBuys: number;
    recentCongressionalSells: number;
    recentInsiderBuys: number;
    recentInsiderSells: number;
    redditMentionsLast7Days: number;
    lobbyingSpend?: number;
  };
}

export class QuiverService {
  private username: string;
  private token: string;
  private baseUrl = 'https://api.quiverquant.com/beta';

  constructor(username?: string, token?: string) {
    this.username = username || process.env.QUIVER_USERNAME || '';
    this.token = token || process.env.QUIVER_TOKEN || '';
  }

  private getAuthHeaders() {
    // Quiver uses Token authentication
    return {
      'Authorization': `Token ${this.token}`,
      'Accept': 'application/json'
    };
  }

  async getQuiverData(symbol: string): Promise<QuiverData> {
    if (!this.username || !this.token) {
      console.log('Quiver API credentials not configured');
      return this.getEmptyData();
    }

    const data: QuiverData = {
      congressionalTrades: [],
      insiderTrades: [],
      redditMentions: [],
      lobbyingActivity: [],
      summary: {
        recentCongressionalBuys: 0,
        recentCongressionalSells: 0,
        recentInsiderBuys: 0,
        recentInsiderSells: 0,
        redditMentionsLast7Days: 0
      }
    };

    // Fetch all data in parallel
    const [congressional, insider, reddit] = await Promise.allSettled([
      this.getCongressionalTrades(symbol),
      this.getInsiderTrades(symbol),
      this.getRedditMentions(symbol)
    ]);

    // Process congressional trades
    if (congressional.status === 'fulfilled') {
      data.congressionalTrades = congressional.value;
      data.summary.recentCongressionalBuys = congressional.value.filter(t =>
        t.transaction === 'Purchase' && this.isRecent(t.date, 30)
      ).length;
      data.summary.recentCongressionalSells = congressional.value.filter(t =>
        t.transaction === 'Sale' && this.isRecent(t.date, 30)
      ).length;
    }

    // Process insider trades
    if (insider.status === 'fulfilled') {
      data.insiderTrades = insider.value;
      data.summary.recentInsiderBuys = insider.value.filter(t =>
        t.transaction.toLowerCase().includes('buy') && this.isRecent(t.tradeDate, 30)
      ).length;
      data.summary.recentInsiderSells = insider.value.filter(t =>
        t.transaction.toLowerCase().includes('sale') && this.isRecent(t.tradeDate, 30)
      ).length;
    }

    // Process Reddit mentions
    if (reddit.status === 'fulfilled') {
      data.redditMentions = reddit.value;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      data.summary.redditMentionsLast7Days = reddit.value
        .filter(m => new Date(m.date) >= sevenDaysAgo)
        .reduce((sum, m) => sum + m.mentions, 0);
    }

    return data;
  }

  private async getCongressionalTrades(symbol: string): Promise<CongressionalTrade[]> {
    try {
      // Use bulk endpoint and filter for symbol - increase timeout for large dataset
      const response = await axios.get(`${this.baseUrl}/bulk/congresstrading`, {
        headers: this.getAuthHeaders(),
        timeout: 30000 // Increase timeout for bulk endpoint
      });

      const allTrades = response.data || [];
      // Filter for this symbol and get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trades = allTrades
        .filter((t: any) => {
          if (t.Ticker !== symbol) return false;
          const tradeDate = new Date(t.Traded);
          return tradeDate >= thirtyDaysAgo;
        })
        .slice(0, 20);

      console.log(`Quiver: Found ${trades.length} congressional trades for ${symbol} in last 30 days`);

      return trades.map((trade: any) => ({
        representative: trade.Name || 'Unknown',
        transaction: trade.Transaction || 'Unknown',
        amount: trade.Trade_Size_USD || 'Unknown',
        date: trade.Traded || new Date().toISOString(),
        party: trade.Party || undefined
      }));
    } catch (error: any) {
      console.error('Error fetching congressional trades:', error.response?.status || error.message);
      return [];
    }
  }

  private async getInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
    try {
      // Use the historical endpoint with auth headers
      const response = await axios.get(`${this.baseUrl}/historical/insidertrading/${symbol}`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      const trades = response.data || [];
      console.log(`Quiver: Found ${trades.length} insider trades for ${symbol}`);

      return trades.slice(0, 20).map((trade: any) => ({
        filingDate: trade.FilingDate || trade.filing_date || new Date().toISOString(),
        tradeDate: trade.TradeDate || trade.trade_date || new Date().toISOString(),
        insider: trade.Insider || trade.insider || 'Unknown',
        title: trade.Title || trade.title || 'Executive',
        transaction: trade.Transaction || trade.transaction || 'Unknown',
        shares: parseInt(trade.Shares || trade.shares || '0'),
        value: trade.Value || trade.value
      }));
    } catch (error: any) {
      console.error('Error fetching insider trades:', error.message);
      return [];
    }
  }

  private async getRedditMentions(symbol: string): Promise<RedditMention[]> {
    try {
      // Use the historical endpoint with auth headers
      const response = await axios.get(`${this.baseUrl}/historical/wallstreetbets/${symbol}`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      const mentions = response.data || [];
      console.log(`Quiver: Found ${mentions.length} Reddit mentions for ${symbol}`);

      return mentions.slice(0, 30).map((mention: any) => ({
        date: mention.Date || mention.date || new Date().toISOString(),
        mentions: parseInt(mention.Mentions || mention.mentions || '0'),
        sentiment: mention.Sentiment || mention.sentiment,
        rank: mention.Rank || mention.rank
      }));
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error('Quiver Reddit API: 403 Forbidden - This feature may require a premium plan');
      } else {
        console.error('Error fetching Reddit mentions:', error.message);
      }
      return [];
    }
  }

  private isRecent(dateStr: string, days: number): boolean {
    try {
      const date = new Date(dateStr);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      return date >= daysAgo;
    } catch {
      return false;
    }
  }

  private getEmptyData(): QuiverData {
    return {
      congressionalTrades: [],
      insiderTrades: [],
      redditMentions: [],
      lobbyingActivity: [],
      summary: {
        recentCongressionalBuys: 0,
        recentCongressionalSells: 0,
        recentInsiderBuys: 0,
        recentInsiderSells: 0,
        redditMentionsLast7Days: 0
      }
    };
  }

  // Helper method to generate human-readable summary
  generateSummary(data: QuiverData): string {
    const parts: string[] = [];

    // Congressional activity
    if (data.summary.recentCongressionalBuys > 0 || data.summary.recentCongressionalSells > 0) {
      parts.push(`Congress: ${data.summary.recentCongressionalBuys} buys, ${data.summary.recentCongressionalSells} sells (30d)`);
    }

    // Insider activity
    if (data.summary.recentInsiderBuys > 0 || data.summary.recentInsiderSells > 0) {
      parts.push(`Insiders: ${data.summary.recentInsiderBuys} buys, ${data.summary.recentInsiderSells} sells (30d)`);
    }

    // Reddit mentions
    if (data.summary.redditMentionsLast7Days > 0) {
      parts.push(`WSB: ${data.summary.redditMentionsLast7Days} mentions (7d)`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No recent activity';
  }
}
