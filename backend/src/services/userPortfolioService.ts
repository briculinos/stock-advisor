import fs from 'fs';
import path from 'path';

// CommonJS globals
declare const __dirname: string;

interface Stock {
  symbol: string;
  companyName: string;
}

interface UserPortfolio {
  followedStocks: Stock[];
  ownedStocks: Stock[];
}

interface UserPortfolios {
  [userId: string]: UserPortfolio;
}

export class UserPortfolioService {
  private portfolioFilePath: string;
  private portfolios: UserPortfolios;

  constructor() {
    this.portfolioFilePath = path.join(__dirname, '../../data/user-portfolios.json');
    this.portfolios = this.loadPortfolios();
  }

  private loadPortfolios(): UserPortfolios {
    try {
      if (fs.existsSync(this.portfolioFilePath)) {
        const data = fs.readFileSync(this.portfolioFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading user portfolios:', error);
    }
    return {};
  }

  private savePortfolios(): void {
    try {
      const dir = path.dirname(this.portfolioFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.portfolioFilePath, JSON.stringify(this.portfolios, null, 2));
    } catch (error) {
      console.error('Error saving user portfolios:', error);
    }
  }

  public getUserPortfolio(userId: string): UserPortfolio {
    if (!this.portfolios[userId]) {
      this.portfolios[userId] = {
        followedStocks: [],
        ownedStocks: []
      };
    }
    return this.portfolios[userId];
  }

  public updateFollowedStocks(userId: string, stocks: Stock[]): void {
    if (!this.portfolios[userId]) {
      this.portfolios[userId] = {
        followedStocks: [],
        ownedStocks: []
      };
    }
    this.portfolios[userId].followedStocks = stocks;
    this.savePortfolios();
  }

  public updateOwnedStocks(userId: string, stocks: Stock[]): void {
    if (!this.portfolios[userId]) {
      this.portfolios[userId] = {
        followedStocks: [],
        ownedStocks: []
      };
    }
    this.portfolios[userId].ownedStocks = stocks;
    this.savePortfolios();
  }

  public getAllUniqueSymbols(): string[] {
    const symbolsSet = new Set<string>();

    Object.values(this.portfolios).forEach(portfolio => {
      portfolio.followedStocks.forEach(stock => symbolsSet.add(stock.symbol));
      portfolio.ownedStocks.forEach(stock => symbolsSet.add(stock.symbol));
    });

    return Array.from(symbolsSet);
  }

  public getAllUserIds(): string[] {
    return Object.keys(this.portfolios);
  }
}
