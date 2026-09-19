import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, IAccessTokenPayload } from '../utils/jwt';
import { UserRole } from '../generated/prisma/client';
import { userRepository } from '../repositories/user.repository';
import type { RefreshSession } from '../generated/prisma/client';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IAccessTokenPayload;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Extract token from request (Authorization header or cookie)
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

/**
 * Replaces the Mongoose RefreshSession.isValid() instance method.
 * A session is valid when it is neither revoked nor past its expiry date.
 */
function isSessionValid(session: RefreshSession): boolean {
  return !session.revoked && new Date() <= session.expiresAt;
}

// ─── authenticate ─────────────────────────────────────────────────────────────
// Require a valid access token. Validates against the Prisma refresh_sessions
// and users tables (PostgreSQL only — no Mongoose dependency).
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

    // 1. Cryptographically verify the JWT
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

    // 2. Validate the session still exists, belongs to this user, and is not
    //    revoked or expired (PostgreSQL / Prisma — zero Mongoose dependency)
    const session = await userRepository.findRefreshSession(decoded.sessionId);

    if (
      !session ||
      session.userId !== decoded.userId || // Guard against sessionId collision across users
      !isSessionValid(session)
    ) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Session is invalid or expired',
      });
      return;
    }

    // 3. Confirm the user still exists and is active (PostgreSQL / Prisma)
    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive',
      });
      return;
    }

    // 4. Attach decoded payload to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

// ─── optionalAuth ─────────────────────────────────────────────────────────────
// Like authenticate but does not fail when no token is present.
// Used for public endpoints that behave differently when logged in.
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }

    try {
      const decoded = verifyAccessToken(token);

      const session = await userRepository.findRefreshSession(decoded.sessionId);
      if (
        session &&
        session.userId === decoded.userId &&
        isSessionValid(session)
      ) {
        const user = await userRepository.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = decoded;
        }
      }
    } catch {
      // Invalid / expired token — silently ignore, continue without user
    }

    next();
  } catch {
    next();
  }
};

// ─── requireRole ──────────────────────────────────────────────────────────────
// Restrict an endpoint to specific roles. Must be used after authenticate.
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// ─── requireAdmin ─────────────────────────────────────────────────────────────
export const requireAdmin = requireRole(UserRole.admin, UserRole.super_admin);

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
export const requireSuperAdmin = requireRole(UserRole.super_admin);

// ─── requireOwnership ────────────────────────────────────────────────────────
// Allows admins through unconditionally; customers must own the resource.
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admins bypass ownership check
    if (
      req.user.role === UserRole.admin ||
      req.user.role === UserRole.super_admin
    ) {
      next();
      return;
    }

    const resourceUserId =
      req.params[userIdField] ||
      req.body[userIdField] ||
      req.query[userIdField];

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
