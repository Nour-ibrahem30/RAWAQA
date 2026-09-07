import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Middleware factory — returns 404 if a feature flag is disabled.
 * Usage: router.use(featureFlag('FEATURE_REVIEWS'))
 */
export const featureFlag = (flag: keyof typeof env) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!env[flag]) {
      res.status(404).json({
        success: false,
        message: 'This feature is not currently enabled.',
      });
      return;
    }
    next();
  };
};
