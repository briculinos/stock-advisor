import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log(`⚠️  [AUTH] No token provided for ${req.method} ${req.path} from ${req.ip}`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const result = authService.verifyToken(token);

    if (!result.valid) {
      console.log(`⚠️  [AUTH] Invalid token for ${req.method} ${req.path} from ${req.ip}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = result.user;

    // Log successful authentication
    console.log(`✅ [AUTH] User "${result.user?.username}" authenticated for ${req.method} ${req.path}`);

    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if missing
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const result = authService.verifyToken(token);
      if (result.valid) {
        req.user = result.user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
