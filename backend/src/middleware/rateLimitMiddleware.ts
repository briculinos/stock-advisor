import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from '../services/rateLimitService';

/**
 * Rate limiting middleware for API endpoints
 * Checks if user has exceeded their daily limit
 */
export const rateLimitMiddleware = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const username = req.user?.username;
    const email = req.user?.email;

    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user can make this request (pass email for whitelist check)
    const check = rateLimitService.canMakeRequest(username, endpoint, email);

    if (!check.allowed) {
      console.log(`⛔ [RATE LIMIT] Request blocked for ${username} on ${endpoint}: ${check.message}`);
      return res.status(429).json({
        success: false,
        message: check.message,
        remaining: 0,
        resetTime: 'midnight UTC'
      });
    }

    // Record the request
    rateLimitService.recordRequest(username, endpoint);

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Remaining', check.remaining.toString());
    res.setHeader('X-RateLimit-Endpoint', endpoint);

    next();
  };
};

/**
 * Get user's current usage stats (middleware)
 */
export const usageStatsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const username = req.user?.username;

  if (username) {
    const stats = rateLimitService.getTodayUsage(username);
    res.locals.usageStats = stats;
  }

  next();
};
