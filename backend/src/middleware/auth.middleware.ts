import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, IAccessTokenPayload } from '../utils/jwt';
import { User, UserRole } from '../models/User';
import { RefreshSession } from '../models/RefreshSession';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IAccessTokenPayload;
    }
  }
}

// Extract token from request
const extractToken = (req: Request): string | null => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

// Authenticate user (require valid access token)
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
      return;
    }

    // Verify token
    let decoded: IAccessTokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token',
      });
      return;
    }

    // Check if session is still valid
    const session = await RefreshSession.findOne({
      sessionId: decoded.sessionId,
      userId: decoded.userId,
    });

    if (!session || !session.isValid()) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session is invalid or expired',
      });
      return;
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive',
      });
      return;
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

// Optional authentication (don't fail if no token)
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token, but that's okay
      next();
      return;
    }

    // Try to verify token
    try {
      const decoded = verifyAccessToken(token);
      
      // Check session
      const session = await RefreshSession.findOne({
        sessionId: decoded.sessionId,
        userId: decoded.userId,
      });

      if (session && session.isValid()) {
        // Check user
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = decoded;
        }
      }
    } catch (error) {
      // Invalid token, but don't fail - just continue without user
    }

    next();
  } catch (error) {
    next();
  }
};

// Require specific role
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Require admin role
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Require super admin role
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

// Check if user owns resource
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admin can access any resource
    if (
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.SUPER_ADMIN
    ) {
      next();
      return;
    }

    // Check ownership
    const resourceUserId =
      req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

    if (!resourceUserId || resourceUserId !== req.user.userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
      return;
    }

    next();
  };
};
