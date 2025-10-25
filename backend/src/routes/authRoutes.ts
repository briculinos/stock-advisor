import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { authenticateToken } from '../middleware/authMiddleware';
import { rateLimitService } from '../services/rateLimitService';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, inviteCode } = req.body;

    console.log(`📝 [AUTH] Registration attempt for username: ${username}${inviteCode ? ` with invite code: ${inviteCode}` : ''}`);

    const result = await authService.register(username, email, password, inviteCode);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`🔑 [AUTH] Login attempt for username: ${username} from ${ip}`);

    const result = await authService.login(username, password, ip, userAgent);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        token: result.token,
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify token (requires authentication)
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

/**
 * GET /api/auth/logs/my-attempts
 * Get login attempts for current user
 */
router.get('/logs/my-attempts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(400).json({ error: 'Username not found' });
    }

    const attempts = authService.getLoginAttempts(username, 20);
    res.json({
      success: true,
      attempts
    });
  } catch (error) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({ error: 'Failed to fetch login attempts' });
  }
});

/**
 * GET /api/auth/stats
 * Get authentication statistics (requires authentication)
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userCount = authService.getUserCount();
    const recentAttempts = authService.getAllLoginAttempts(10);

    res.json({
      success: true,
      stats: {
        totalUsers: userCount,
        recentAttempts: recentAttempts.length,
        successfulLogins: recentAttempts.filter(a => a.success).length,
        failedLogins: recentAttempts.filter(a => !a.success).length
      },
      recentAttempts
    });
  } catch (error) {
    console.error('Error fetching auth stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/auth/usage
 * Get current user's API usage statistics
 */
router.get('/usage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(400).json({ error: 'Username not found' });
    }

    const todayUsage = rateLimitService.getTodayUsage(username);
    const userStats = rateLimitService.getUserStats(username);

    res.json({
      success: true,
      usage: {
        today: todayUsage,
        totalAllTime: userStats?.totalApiCalls || 0,
        history: userStats?.usageHistory.slice(-7) || [] // Last 7 days
      }
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

export default router;
