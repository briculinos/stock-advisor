import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string;
}

interface LoginAttempt {
  username: string;
  timestamp: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private loginAttempts: LoginAttempt[] = [];
  private whitelistedEmails: Set<string> = new Set();
  private readonly usersFilePath = join(__dirname, '../../data/users.json');
  private readonly logsFilePath = join(__dirname, '../../data/auth-logs.json');
  private readonly whitelistFilePath = join(__dirname, '../../data/email-whitelist.json');
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private readonly JWT_EXPIRES_IN = '7d'; // 7 days

  constructor() {
    this.loadUsers();
    this.loadLogs();
    this.loadWhitelist();
  }

  /**
   * Load whitelisted emails from environment variable or file
   */
  private loadWhitelist() {
    try {
      // First, try to load from environment variable
      const envWhitelist = process.env.WHITELISTED_EMAILS;
      if (envWhitelist) {
        const emails = envWhitelist.split(',').map(e => e.trim().toLowerCase());
        this.whitelistedEmails = new Set(emails);
        console.log(`✅ Loaded ${this.whitelistedEmails.size} whitelisted emails from environment`);
        return;
      }

      // If no env variable, try to load from file
      if (existsSync(this.whitelistFilePath)) {
        const data = readFileSync(this.whitelistFilePath, 'utf-8');
        const emails = JSON.parse(data);
        this.whitelistedEmails = new Set(emails.map((e: string) => e.toLowerCase()));
        console.log(`✅ Loaded ${this.whitelistedEmails.size} whitelisted emails from file`);
      } else {
        console.log('⚠️  No email whitelist found. All emails will be allowed to register.');
        console.log('   Set WHITELISTED_EMAILS environment variable or create data/email-whitelist.json');
      }
    } catch (error) {
      console.error('Error loading whitelist:', error);
      console.log('⚠️  Email whitelist disabled. All emails will be allowed to register.');
    }
  }

  /**
   * Check if an email is whitelisted
   */
  private isEmailWhitelisted(email: string): boolean {
    // If no whitelist is configured, allow all emails
    if (this.whitelistedEmails.size === 0) {
      return true;
    }
    return this.whitelistedEmails.has(email.toLowerCase());
  }

  /**
   * Load users from file
   */
  private loadUsers() {
    try {
      if (existsSync(this.usersFilePath)) {
        const data = readFileSync(this.usersFilePath, 'utf-8');
        const usersArray = JSON.parse(data);
        this.users = new Map(usersArray.map((u: User) => [u.username, u]));
        console.log(`✅ Loaded ${this.users.size} users from storage`);
      } else {
        console.log('📝 No existing users file, starting fresh');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  /**
   * Save users to file
   */
  private saveUsers() {
    try {
      const usersArray = Array.from(this.users.values());
      const dir = join(__dirname, '../../data');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.usersFilePath, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  /**
   * Load login logs from file
   */
  private loadLogs() {
    try {
      if (existsSync(this.logsFilePath)) {
        const data = readFileSync(this.logsFilePath, 'utf-8');
        this.loginAttempts = JSON.parse(data);
        console.log(`✅ Loaded ${this.loginAttempts.length} login attempts from logs`);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  /**
   * Save login logs to file
   */
  private saveLogs() {
    try {
      const dir = join(__dirname, '../../data');
      if (!existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.logsFilePath, JSON.stringify(this.loginAttempts, null, 2));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  /**
   * Log authentication attempt
   */
  private logAttempt(username: string, success: boolean, ip?: string, userAgent?: string) {
    const attempt: LoginAttempt = {
      username,
      timestamp: new Date().toISOString(),
      success,
      ip,
      userAgent
    };

    this.loginAttempts.push(attempt);

    // Keep only last 1000 attempts
    if (this.loginAttempts.length > 1000) {
      this.loginAttempts = this.loginAttempts.slice(-1000);
    }

    this.saveLogs();

    // Console log for real-time monitoring
    const status = success ? '✅ SUCCESS' : '❌ FAILED';
    const ipInfo = ip ? ` from ${ip}` : '';
    console.log(`🔐 [AUTH] ${status} - User: ${username}${ipInfo} at ${attempt.timestamp}`);
  }

  /**
   * Register a new user
   */
  async register(username: string, email: string, password: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      // Validation
      if (!username || username.length < 3) {
        return { success: false, message: 'Username must be at least 3 characters' };
      }

      if (!email || !email.includes('@')) {
        return { success: false, message: 'Valid email is required' };
      }

      if (!password || password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
      }

      // Check if email is whitelisted
      if (!this.isEmailWhitelisted(email)) {
        console.log(`⛔ [AUTH] Registration blocked - Email "${email}" is not whitelisted`);
        return { success: false, message: 'This email is not authorized to register. Please contact the administrator.' };
      }

      // Check if user already exists
      if (this.users.has(username)) {
        console.log(`⚠️  [AUTH] Registration failed - Username "${username}" already exists`);
        return { success: false, message: 'Username already exists' };
      }

      // Check if email already exists
      for (const user of this.users.values()) {
        if (user.email === email) {
          console.log(`⚠️  [AUTH] Registration failed - Email "${email}" already exists`);
          return { success: false, message: 'Email already exists' };
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const user: User = {
        id: this.generateId(),
        username,
        email,
        passwordHash,
        createdAt: new Date().toISOString()
      };

      this.users.set(username, user);
      this.saveUsers();

      console.log(`✅ [AUTH] New user registered: ${username} (${email})`);

      // Generate token
      const token = this.generateToken(user);

      return {
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Error during registration:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Login user
   */
  async login(username: string, password: string, ip?: string, userAgent?: string): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      // Find user
      const user = this.users.get(username);

      if (!user) {
        this.logAttempt(username, false, ip, userAgent);
        return { success: false, message: 'Invalid username or password' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        this.logAttempt(username, false, ip, userAgent);
        return { success: false, message: 'Invalid username or password' };
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      this.users.set(username, user);
      this.saveUsers();

      // Log successful login
      this.logAttempt(username, true, ip, userAgent);

      // Generate token
      const token = this.generateToken(user);

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      };
    } catch (error) {
      console.error('Error during login:', error);
      this.logAttempt(username, false, ip, userAgent);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { valid: boolean; user?: any } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      // Check if user still exists
      const user = this.users.get(decoded.username);
      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get login attempts for a user
   */
  getLoginAttempts(username: string, limit: number = 10): LoginAttempt[] {
    return this.loginAttempts
      .filter(attempt => attempt.username === username)
      .slice(-limit);
  }

  /**
   * Get all recent login attempts (admin)
   */
  getAllLoginAttempts(limit: number = 50): LoginAttempt[] {
    return this.loginAttempts.slice(-limit);
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.users.size;
  }

  /**
   * Get all users (without passwords)
   */
  getAllUsers(): any[] {
    return Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
  }
}

export const authService = new AuthService();
