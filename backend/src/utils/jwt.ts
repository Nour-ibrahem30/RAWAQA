import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

// Access token payload
export interface IAccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;  // Link to refresh session
}

// Refresh token payload
export interface IRefreshTokenPayload {
  userId: string;
  sessionId: string;  // Stable session identifier (jti)
}

// Generate access token
export const generateAccessToken = (payload: IAccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'rawaqa-api',
    audience: 'rawaqa-client',
  } as SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (payload: IRefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'rawaqa-api',
    audience: 'rawaqa-client',
    jwtid: payload.sessionId,
  } as SignOptions);
};

// Verify access token
export const verifyAccessToken = (token: string): IAccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'rawaqa-api',
      audience: 'rawaqa-client',
    }) as IAccessTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): IRefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'rawaqa-api',
      audience: 'rawaqa-client',
    }) as IRefreshTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

// Calculate token expiry duration in milliseconds
export const getAccessTokenExpiryMs = (): number => {
  const match = env.JWT_ACCESS_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes
  
  const value = parseInt(match[1] || '15', 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

export const getRefreshTokenExpiryMs = (): number => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  
  const value = parseInt(match[1] || '7', 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};
