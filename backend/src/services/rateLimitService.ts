import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// CommonJS globals
declare const __dirname: string;

interface UserUsage {
  username: string;
  dailyLimit: number;
  usageHistory: {
    date: string; // YYYY-MM-DD
    count: number;
    endpoints: {
      [endpoint: string]: number;
    };
  }[];
  totalApiCalls: number;
  lastReset: string;
}

export class RateLimitService {
  private usage: Map<string, UserUsage> = new Map();
  private readonly usageFilePath = join(__dirname, '../../data/usage-tracking.json');

  // Default limits
  private readonly DEFAULT_DAILY_LIMIT = 50; // 50 stock analyses per day for test users

  constructor() {
    this.loadUsage();
    // Clean up old data daily
    this.scheduleCleanup();
  }

  /**
   * Load usage data from file
   */
  private loadUsage() {
    try {
      if (existsSync(this.usageFilePath)) {
        const data = readFileSync(this.usageFilePath, 'utf-8');
        const usageArray = JSON.parse(data);
        this.usage = new Map(usageArray.map((u: UserUsage) => [u.username, u]));
        console.log(`✅ Loaded usage data for ${this.usage.size} users`);
      } else {
        console.log('📝 No existing usage data, starting fresh');
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  }

  /**
   * Save usage data to file
   */
  private saveUsage() {
    try {
      const usageArray = Array.from(this.usage.values());
      const dir = join(__dirname, '../../data');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.usageFilePath, JSON.stringify(usageArray, null, 2));
    } catch (error) {
      console.error('Error saving usage data:', error);
    }
  }

  /**
   * Get today's date string (YYYY-MM-DD)
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Initialize user usage tracking
   */
  private initUserUsage(username: string): UserUsage {
    const userUsage: UserUsage = {
      username,
      dailyLimit: this.DEFAULT_DAILY_LIMIT,
      usageHistory: [],
      totalApiCalls: 0,
      lastReset: new Date().toISOString()
    };

    this.usage.set(username, userUsage);
    this.saveUsage();
    return userUsage;
  }

  /**
   * Check if user can make an API call
   */
  canMakeRequest(username: string, endpoint: string): { allowed: boolean; remaining: number; message?: string } {
    let userUsage = this.usage.get(username);

    if (!userUsage) {
      userUsage = this.initUserUsage(username);
    }

    const today = this.getTodayString();
    let todayUsage = userUsage.usageHistory.find(h => h.date === today);

    if (!todayUsage) {
      todayUsage = {
        date: today,
        count: 0,
        endpoints: {}
      };
      userUsage.usageHistory.push(todayUsage);
    }

    const currentCount = todayUsage.count;
    const remaining = userUsage.dailyLimit - currentCount;

    if (currentCount >= userUsage.dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        message: `Daily limit of ${userUsage.dailyLimit} requests reached. Resets at midnight UTC.`
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1 // After this request
    };
  }

  /**
   * Record an API call
   */
  recordRequest(username: string, endpoint: string): void {
    let userUsage = this.usage.get(username);

    if (!userUsage) {
      userUsage = this.initUserUsage(username);
    }

    const today = this.getTodayString();
    let todayUsage = userUsage.usageHistory.find(h => h.date === today);

    if (!todayUsage) {
      todayUsage = {
        date: today,
        count: 0,
        endpoints: {}
      };
      userUsage.usageHistory.push(todayUsage);
    }

    todayUsage.count++;
    todayUsage.endpoints[endpoint] = (todayUsage.endpoints[endpoint] || 0) + 1;
    userUsage.totalApiCalls++;

    this.usage.set(username, userUsage);
    this.saveUsage();

    console.log(`📊 API call recorded: ${username} -> ${endpoint} (${todayUsage.count}/${userUsage.dailyLimit} today)`);
  }

  /**
   * Set custom daily limit for a user
   */
  setUserLimit(username: string, dailyLimit: number): void {
    let userUsage = this.usage.get(username);

    if (!userUsage) {
      userUsage = this.initUserUsage(username);
    }

    userUsage.dailyLimit = dailyLimit;
    this.usage.set(username, userUsage);
    this.saveUsage();

    console.log(`✅ Set daily limit for ${username}: ${dailyLimit} requests/day`);
  }

  /**
   * Get user usage statistics
   */
  getUserStats(username: string): UserUsage | null {
    return this.usage.get(username) || null;
  }

  /**
   * Get all users usage statistics
   */
  getAllStats(): UserUsage[] {
    return Array.from(this.usage.values());
  }

  /**
   * Get today's usage for a user
   */
  getTodayUsage(username: string): { count: number; limit: number; remaining: number } {
    const userUsage = this.usage.get(username);

    if (!userUsage) {
      return { count: 0, limit: this.DEFAULT_DAILY_LIMIT, remaining: this.DEFAULT_DAILY_LIMIT };
    }

    const today = this.getTodayString();
    const todayUsage = userUsage.usageHistory.find(h => h.date === today);

    return {
      count: todayUsage?.count || 0,
      limit: userUsage.dailyLimit,
      remaining: userUsage.dailyLimit - (todayUsage?.count || 0)
    };
  }

  /**
   * Clean up old usage data (keep only last 30 days)
   */
  private scheduleCleanup() {
    setInterval(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      for (const [username, userUsage] of this.usage.entries()) {
        userUsage.usageHistory = userUsage.usageHistory.filter(h => h.date >= cutoffDate);
        this.usage.set(username, userUsage);
      }

      this.saveUsage();
      console.log('🧹 Cleaned up old usage data (>30 days)');
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Reset user's daily usage (for testing)
   */
  resetUserToday(username: string): void {
    const userUsage = this.usage.get(username);
    if (!userUsage) return;

    const today = this.getTodayString();
    userUsage.usageHistory = userUsage.usageHistory.filter(h => h.date !== today);

    this.usage.set(username, userUsage);
    this.saveUsage();

    console.log(`🔄 Reset today's usage for ${username}`);
  }
}

export const rateLimitService = new RateLimitService();
