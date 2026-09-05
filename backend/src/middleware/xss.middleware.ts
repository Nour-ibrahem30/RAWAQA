/**
 * XSS Sanitization Middleware
 * Recursively sanitizes all string values in req.body, req.query, req.params
 * Uses the `xss` library which is actively maintained
 */

import { Request, Response, NextFunction } from 'express';
import { filterXSS } from 'xss';

// Recursively sanitize an object
const sanitize = (value: any): any => {
  if (typeof value === 'string') {
    return filterXSS(value, {
      whiteList: {},         // strip ALL HTML tags
      stripIgnoreTag: true,  // remove content inside disallowed tags
      stripIgnoreTagBody: ['script', 'style'], // remove body of script/style
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      result[key] = sanitize(value[key]);
    }
    return result;
  }

  return value; // numbers, booleans, null, undefined — unchanged
};

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * Apply AFTER body-parser but BEFORE route handlers
 */
export const xssSanitize = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body)   req.body   = sanitize(req.body);
  if (req.query)  req.query  = sanitize(req.query) as any;
  if (req.params) req.params = sanitize(req.params);
  next();
};
