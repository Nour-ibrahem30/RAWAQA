/**
 * auth.service.ts — PostgreSQL/Prisma implementation
 * Migrated from Mongoose. Business logic is identical.
 * All DB access goes through userRepository (Prisma-backed).
 */
import bcrypt from 'bcryptjs';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryMs,
  IAccessTokenPayload,
  IRefreshTokenPayload,
} from '../utils/jwt';
import { env } from '../config/env';
import { logError, logInfo } from '../config/logger';
import { userRepository } from '../repositories/user.repository';
import { smsService }   from './sms.service';
import { emailService } from './email.service';
import { OtpPurpose }   from '../generated/prisma/client';
import type { User, RefreshSession, OtpToken } from '../generated/prisma/client';

// ---------------------------------------------------------------------------
// Device / auth types (kept identical to the Mongoose version)
// ---------------------------------------------------------------------------
export interface IDeviceInfo {
  userAgent?: string;
  ip?: string;
  platform?: string;
  browser?: string;
}

export interface IAuthResponse {
  user: {
    id:        string;
    email:     string;
    firstName: string;
    lastName:  string;
    role:      string;
    avatar?:   string;
  };
  accessToken:  string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerUser = async (data: {
  email:     string;
  password:  string;
  firstName: string;
  lastName:  string;
  phone?:    string;
}): Promise<User> => {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) throw new Error('User with this email already exists');

  // Hash password before passing to repository (no Mongoose pre-save hook in Prisma)
  const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS || 10);

  const user = await userRepository.create({
    email:      data.email.toLowerCase(),
    password:   hashedPassword,
    firstName:  data.firstName,
    lastName:   data.lastName,
    phone:      data.phone,
    role:       'customer' as any,
    authProvider: 'local' as any,
  });

  logInfo('User registered successfully', { userId: user.id, email: user.email });
  return user;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginUser = async (
  email:      string,
  password:   string,
  deviceInfo?: IDeviceInfo
): Promise<IAuthResponse> => {
  // findByEmail does NOT select password — we need a raw Prisma query with password
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user) throw new Error('Invalid email or password');
  if (!user.isActive) throw new Error('Account is deactivated');
  if (!user.password) throw new Error('Invalid email or password');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid email or password');

  // Update last login
  await userRepository.update(user.id, { lastLoginAt: new Date() });

  // Enforce session limit
  const sessionCount = await userRepository.countActiveSessions(user.id);
  if (sessionCount >= (env.MAX_ACTIVE_SESSIONS_PER_USER || 5)) {
    await userRepository.revokeOldestSession(user.id);
    logInfo('Revoked oldest session due to limit', { userId: user.id });
  }

  const tokens = await generateUserTokens(user, deviceInfo);

  logInfo('User logged in successfully', { userId: user.id, email: user.email });

  return {
    user: {
      id:        user.id,
      email:     user.email,
      firstName: user.firstName,
      lastName:  user.lastName,
      role:      user.role,
    },
    ...tokens,
  };
};

// ---------------------------------------------------------------------------
// Google Auth (4-attempt verification, identical logic)
// ---------------------------------------------------------------------------
export const googleAuth = async (
  credential: string,
  deviceInfo?: IDeviceInfo
): Promise<IAuthResponse> => {
  if (!credential) throw new Error('Google credential token is required');

  let googlePayload: {
    sub: string;
    email: string;
    email_verified?: string | boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    aud?: string;
  } | null = null;

  // Attempt A: id_token
  try {
    const res = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { timeout: 8000 }
    );
    if (res.data?.email) googlePayload = res.data;
  } catch { /* try next */ }

  // Attempt B: Bearer userinfo
  if (!googlePayload) {
    try {
      const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${credential}` },
        timeout: 8000,
      });
      if (res.data?.email) {
        googlePayload = {
          sub:            res.data.sub,
          email:          res.data.email,
          email_verified: res.data.email_verified,
          name:           res.data.name,
          given_name:     res.data.given_name,
          family_name:    res.data.family_name,
          picture:        res.data.picture,
        };
      }
    } catch { /* try next */ }
  }

  // Attempt C: access_token
  if (!googlePayload) {
    try {
      const res = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(credential)}`,
        { timeout: 8000 }
      );
      if (res.data?.email) {
        googlePayload = {
          sub:            res.data.sub || res.data.user_id,
          email:          res.data.email,
          email_verified: res.data.verified_email,
        };
      }
    } catch { /* try next */ }
  }

  // Attempt D: JWT decode fallback
  if (!googlePayload && credential.split('.').length === 3) {
    try {
      const decoded: any = jwt.decode(credential);
      if (
        decoded?.email &&
        (decoded.iss === 'accounts.google.com' || decoded.iss === 'https://accounts.google.com')
      ) {
        googlePayload = {
          sub:            decoded.sub,
          email:          decoded.email,
          email_verified: decoded.email_verified,
          name:           decoded.name,
          given_name:     decoded.given_name,
          family_name:    decoded.family_name,
          picture:        decoded.picture,
          aud:            decoded.aud,
        };
      }
    } catch (err: any) {
      logError('JWT fallback decode failed', err?.message);
    }
  }

  if (!googlePayload?.email) {
    logError('Google token verification completely failed', new Error('Unable to verify credential'));
    throw new Error('Invalid or expired Google token');
  }

  const email     = googlePayload.email.toLowerCase().trim();
  const googleId  = googlePayload.sub;
  const firstName = googlePayload.given_name || googlePayload.name?.split(' ')[0] || 'User';
  const lastName  = googlePayload.family_name ||
    (googlePayload.name ? googlePayload.name.split(' ').slice(1).join(' ') : '') ||
    'Customer';

  // Find or create user — check googleId first, then email
  let user = await userRepository.findByGoogleId(googleId);
  if (!user) user = await userRepository.findByEmail(email);

  if (user) {
    if (!user.isActive) throw new Error('Account is deactivated');
    const updates: any = { lastLoginAt: new Date() };
    if (!user.googleId)        updates.googleId      = googleId;
    if (!user.isEmailVerified) updates.isEmailVerified = true;
    user = await userRepository.update(user.id, updates);
  } else {
    const hashedPass = undefined; // Google auth — no password
    void hashedPass;
    user = await userRepository.create({
      email,
      googleId,
      authProvider:    'google' as any,
      firstName,
      lastName,
      isEmailVerified: true,
      role:            'customer' as any,
      isActive:        true,
    } as any);
    await userRepository.update(user.id, { lastLoginAt: new Date() });
    logInfo('New user registered via Google Auth', { userId: user.id, email });
  }

  const tokens = await generateUserTokens(user, deviceInfo);
  logInfo('User logged in via Google Auth', { userId: user.id, email: user.email });

  return {
    user: {
      id:        user.id,
      email:     user.email,
      firstName: user.firstName,
      lastName:  user.lastName,
      role:      user.role,
    },
    ...tokens,
  };
};

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------
export const generateUserTokens = async (
  user:        User,
  deviceInfo?: IDeviceInfo
): Promise<{ accessToken: string; refreshToken: string }> => {
  const sessionId = uuidv4();

  const refreshTokenPayload: IRefreshTokenPayload = {
    userId:    user.id,
    sessionId,
  };
  const refreshToken = generateRefreshToken(refreshTokenPayload);
  const tokenHash    = await bcrypt.hash(refreshToken, 10);

  const expiresAt = new Date(Date.now() + getRefreshTokenExpiryMs());
  await userRepository.createRefreshSession({
    sessionId,
    userId:     user.id,
    tokenHash,
    deviceInfo: deviceInfo || {},
    expiresAt,
  });

  const accessToken = generateAccessToken({
    userId:    user.id,
    email:     user.email,
    role:      user.role as any,
    sessionId,
  } as IAccessTokenPayload);

  return { accessToken, refreshToken };
};

// ---------------------------------------------------------------------------
// Token refresh with rotation
// ---------------------------------------------------------------------------
export const refreshTokens = async (
  oldRefreshToken: string,
  deviceInfo?:     IDeviceInfo
): Promise<{ accessToken: string; refreshToken: string }> => {
  let decoded: IRefreshTokenPayload;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const session = await userRepository.findRefreshSession(decoded.sessionId);
  if (!session) throw new Error('Session not found');

  const isSessionValid = !session.revoked && session.expiresAt > new Date();
  if (!isSessionValid) throw new Error('Session is invalid or expired');

  const isTokenValid = await bcrypt.compare(oldRefreshToken, session.tokenHash);
  if (!isTokenValid) {
    // Possible replay attack — revoke session immediately
    await userRepository.revokeRefreshSession(decoded.sessionId);
    logError('Refresh token reuse detected', new Error('Token replay attack'), {
      userId:    decoded.userId,
      sessionId: decoded.sessionId,
    });
    throw new Error('Invalid refresh token - session revoked');
  }

  const user = await userRepository.findById(decoded.userId);
  if (!user || !user.isActive) throw new Error('User not found or inactive');

  const newRefreshToken = generateRefreshToken({
    userId:    user.id,
    sessionId: session.sessionId,
  });
  const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

  // Rotate token hash in-place (same session, new hash)
  await userRepository.updateRefreshSession(session.sessionId, {
    tokenHash:  newTokenHash,
    lastUsedAt: new Date(),
    ...(deviceInfo ? { deviceInfo } : {}),
  });

  const accessToken = generateAccessToken({
    userId:    user.id,
    email:     user.email,
    role:      user.role as any,
    sessionId: session.sessionId,
  } as IAccessTokenPayload);

  logInfo('Tokens refreshed successfully', { userId: user.id, sessionId: session.sessionId });
  return { accessToken, refreshToken: newRefreshToken };
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export const logoutCurrentDevice = async (sessionId: string, userId: string): Promise<void> => {
  const session = await userRepository.findRefreshSession(sessionId);
  if (!session || session.userId !== userId) throw new Error('Session not found');

  await userRepository.revokeRefreshSessionWithReason(sessionId, 'User logout');
  logInfo('User logged out from current device', { userId, sessionId });
};

export const logoutAllDevices = async (userId: string): Promise<number> => {
  await userRepository.revokeAllUserSessions(userId);
  logInfo('User logged out from all devices', { userId });
  // count is approximate — return 1 as convention
  return 1;
};

export const getUserActiveSessions = async (userId: string): Promise<RefreshSession[]> => {
  return userRepository.findActiveSessions(userId);
};

// ---------------------------------------------------------------------------
// OTP utilities
// ---------------------------------------------------------------------------
const generateOtpCode = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOtp = (code: string): string =>
  crypto.createHash('sha256').update(code).digest('hex');

const OTP_TTL_MINUTES = 5;

const sendOtp = async (userId: string, phone: string, purpose: OtpPurpose): Promise<void> => {
  // Invalidate previous unused OTPs for this user+purpose
  await userRepository.deleteOtpTokens(userId, purpose);

  const code      = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await userRepository.createOtpToken({
    userId,
    code:    hashOtp(code),
    purpose,
    phone,
    expiresAt,
  });

  await smsService.sendOTP(phone, code);
};

const verifyOtpToken = async (
  userId: string,
  code:   string,
  purpose: OtpPurpose
): Promise<OtpToken> => {
  const token = await userRepository.findValidOtpToken({ userId, purpose });
  if (!token) throw new Error('OTP not found or expired. Request a new one.');

  const updated = await userRepository.incrementOtpAttempts(token.id);
  if (updated.attempts > 5) throw new Error('Too many wrong attempts. Request a new OTP.');

  if (token.code !== hashOtp(code)) throw new Error('Invalid OTP code.');

  await userRepository.markOtpUsed(token.id);
  return token;
};

// ---------------------------------------------------------------------------
// Forgot / Reset password
// ---------------------------------------------------------------------------
export const forgotPassword = async (phone: string): Promise<void> => {
  const user = await userRepository.findByPhone(phone);
  if (!user || !user.isActive) return; // silently succeed — prevent enumeration

  await sendOtp(user.id, phone, OtpPurpose.password_reset);
};

export const resetPassword = async (
  phone:       string,
  otpCode:     string,
  newPassword: string
): Promise<void> => {
  const user = await userRepository.findByPhone(phone);
  if (!user || !user.isActive) throw new Error('User not found.');

  await verifyOtpToken(user.id, otpCode, OtpPurpose.password_reset);

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS || 10);
  await userRepository.update(user.id, { password: hashedPassword });

  // Revoke all sessions for security
  await userRepository.revokeAllUserSessions(user.id);

  logInfo('Password reset successful', { userId: user.id });
};

// ---------------------------------------------------------------------------
// Phone verification
// ---------------------------------------------------------------------------
export const sendPhoneVerification = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user)       throw new Error('User not found.');
  if (!user.phone) throw new Error('No phone number on account.');
  if (user.isPhoneVerified) throw new Error('Phone already verified.');

  await sendOtp(userId, user.phone, OtpPurpose.phone_verify);
};

export const verifyPhone = async (userId: string, otpCode: string): Promise<void> => {
  await verifyOtpToken(userId, otpCode, OtpPurpose.phone_verify);
  await userRepository.update(userId, { isPhoneVerified: true });
  logInfo('Phone verified', { userId });
};

// ---------------------------------------------------------------------------
// Profile / password management
// ---------------------------------------------------------------------------
export const updateProfile = async (
  userId: string,
  data:   { firstName?: string; lastName?: string; phone?: string }
): Promise<User> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found.');

  const updates: any = {};
  if (data.firstName) updates.firstName = data.firstName;
  if (data.lastName)  updates.lastName  = data.lastName;
  if (data.phone && data.phone !== user.phone) {
    updates.phone          = data.phone;
    updates.isPhoneVerified = false;
  }

  return userRepository.update(userId, updates);
};

export const changePassword = async (
  userId:          string,
  currentPassword: string,
  newPassword:     string
): Promise<void> => {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw new Error('User not found.');

  const valid = await bcrypt.compare(currentPassword, user.password ?? '');
  if (!valid) throw new Error('Current password is incorrect.');

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS || 10);
  await userRepository.update(userId, { password: hashed });

  logInfo('Password changed', { userId });
};

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------
const EMAIL_VERIFY_TTL_HOURS = 24;

export const sendEmailVerification = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found.');
  if (user.isEmailVerified) throw new Error('Email already verified.');

  await userRepository.deleteOtpTokens(userId, OtpPurpose.email_verify);

  const rawToken    = crypto.randomBytes(48).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt   = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000);

  await userRepository.createOtpToken({
    userId,
    email:    user.email,
    code:     hashedToken,
    purpose:  OtpPurpose.email_verify,
    expiresAt,
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  await emailService.sendEmailVerification({
    email:     user.email,
    firstName: user.firstName,
    verifyUrl,
  });

  logInfo('Email verification sent', { userId, email: user.email });
};

export const verifyEmailToken = async (rawToken: string): Promise<User> => {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const token = await userRepository.findOtpByCode(hashedToken, OtpPurpose.email_verify);
  if (!token) throw new Error('Verification link is invalid or has expired.');

  await userRepository.markOtpUsed(token.id);

  const user = await userRepository.update(token.userId, { isEmailVerified: true });
  if (!user) throw new Error('User not found.');

  logInfo('Email verified', { userId: user.id, email: user.email });
  return user;
};

// ---------------------------------------------------------------------------
// Cleanup (cron job helper — now delegates to repository)
// ---------------------------------------------------------------------------
export const cleanupExpiredSessions = async (): Promise<number> => {
  return userRepository.deleteExpiredSessions();
};
