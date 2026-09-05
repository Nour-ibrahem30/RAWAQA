import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, IUser, UserRole } from '../models/User';
import { RefreshSession, IRefreshSession } from '../models/RefreshSession';
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

// Device info interface
export interface IDeviceInfo {
  userAgent?: string;
  ip?: string;
  platform?: string;
  browser?: string;
}

// Auth response
export interface IAuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

// Register user
export const registerUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<IUser> => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create user
  const user = new User({
    email: data.email.toLowerCase(),
    password: data.password, // Will be hashed by pre-save hook
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    role: UserRole.CUSTOMER,
  });

  await user.save();

  logInfo('User registered successfully', {
    userId: user._id,
    email: user.email,
  });

  return user;
};

// Login user
export const loginUser = async (
  email: string,
  password: string,
  deviceInfo?: IDeviceInfo
): Promise<IAuthResponse> => {
  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Check active sessions limit
  const activeSessions = await RefreshSession.countDocuments({
    userId: user._id,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  // If limit reached, revoke oldest session
  if (activeSessions >= env.MAX_ACTIVE_SESSIONS_PER_USER) {
    const oldestSession = await RefreshSession.findOne({
      userId: user._id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });

    if (oldestSession) {
      oldestSession.revoked = true;
      oldestSession.revokedAt = new Date();
      oldestSession.revokedReason = 'Maximum active sessions limit reached';
      await oldestSession.save();

      logInfo('Revoked oldest session due to limit', {
        userId: user._id,
        sessionId: oldestSession.sessionId,
      });
    }
  }

  // Generate tokens
  const tokens = await generateUserTokens(user, deviceInfo);

  logInfo('User logged in successfully', {
    userId: user._id,
    email: user.email,
  });

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    ...tokens,
  };
};

// Generate tokens for user
export const generateUserTokens = async (
  user: IUser,
  deviceInfo?: IDeviceInfo
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Generate stable session ID
  const sessionId = uuidv4();

  // Generate refresh token first (we need to hash it)
  const refreshTokenPayload: IRefreshTokenPayload = {
    userId: user._id.toString(),
    sessionId,
  };
  const refreshToken = generateRefreshToken(refreshTokenPayload);

  // Hash refresh token
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  // Create refresh session
  const expiresAt = new Date(Date.now() + getRefreshTokenExpiryMs());
  await RefreshSession.create({
    userId: user._id,
    sessionId,
    tokenHash,
    deviceInfo: deviceInfo || {},
    issuedAt: new Date(),
    expiresAt,
    lastUsedAt: new Date(),
  });

  // Generate access token
  const accessTokenPayload: IAccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    sessionId,
  };
  const accessToken = generateAccessToken(accessTokenPayload);

  return { accessToken, refreshToken };
};

// Refresh tokens (with rotation)
export const refreshTokens = async (
  oldRefreshToken: string,
  deviceInfo?: IDeviceInfo
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Verify token
  let decoded: IRefreshTokenPayload;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }

  // Find session
  const session = await RefreshSession.findOne({
    sessionId: decoded.sessionId,
    userId: decoded.userId,
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Check if session is valid
  if (!session.isValid()) {
    throw new Error('Session is invalid or expired');
  }

  // Verify token hash (prevent replay attacks)
  const isTokenValid = await bcrypt.compare(oldRefreshToken, session.tokenHash);
  if (!isTokenValid) {
    // Token reuse detected - possible attack
    // Revoke this session
    session.revoked = true;
    session.revokedAt = new Date();
    session.revokedReason = 'Token reuse detected - possible replay attack';
    await session.save();

    logError(
      'Refresh token reuse detected',
      new Error('Token replay attack'),
      {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      }
    );

    throw new Error('Invalid refresh token - session revoked');
  }

  // Get user
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Generate NEW refresh token
  const newRefreshToken = generateRefreshToken({
    userId: user._id.toString(),
    sessionId: session.sessionId, // Keep same sessionId
  });

  // Hash new token
  const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

  // Update session with new token hash
  session.tokenHash = newTokenHash;
  session.lastUsedAt = new Date();
  if (deviceInfo) {
    session.deviceInfo = deviceInfo;
  }
  await session.save();

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    sessionId: session.sessionId,
  });

  logInfo('Tokens refreshed successfully', {
    userId: user._id,
    sessionId: session.sessionId,
  });

  return { accessToken, refreshToken: newRefreshToken };
};

// Logout current device (revoke by sessionId)
export const logoutCurrentDevice = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  const session = await RefreshSession.findOne({
    sessionId,
    userId,
  });

  if (!session) {
    throw new Error('Session not found');
  }

  session.revoked = true;
  session.revokedAt = new Date();
  session.revokedReason = 'User logout';
  await session.save();

  logInfo('User logged out from current device', {
    userId,
    sessionId,
  });
};

// Logout all devices (revoke all user sessions)
export const logoutAllDevices = async (userId: string): Promise<number> => {
  const result = await RefreshSession.updateMany(
    {
      userId,
      revoked: false,
    },
    {
      $set: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'User logout from all devices',
      },
    }
  );

  logInfo('User logged out from all devices', {
    userId,
    sessionsRevoked: result.modifiedCount,
  });

  return result.modifiedCount || 0;
};

// Get user active sessions
export const getUserActiveSessions = async (
  userId: string
): Promise<IRefreshSession[]> => {
  return RefreshSession.find({
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ lastUsedAt: -1 });
};

// Cleanup expired sessions (cron job helper)
export const cleanupExpiredSessions = async (): Promise<number> => {
  const result = await RefreshSession.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { revoked: true, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Revoked > 30 days ago
    ],
  });

  if (result.deletedCount && result.deletedCount > 0) {
    logInfo('Cleaned up expired sessions', {
      deletedCount: result.deletedCount,
    });
  }

  return result.deletedCount || 0;
};

import crypto from 'crypto';
import { OtpToken, OtpPurpose } from '../models/OtpToken';
import { smsService } from './sms.service';

// ─── OTP helpers ──────────────────────────────────────────────────────────────

const generateOtpCode = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

const hashOtp = (code: string): string =>
  crypto.createHash('sha256').update(code).digest('hex');

const OTP_TTL_MINUTES = 5;

// ─── Send OTP ────────────────────────────────────────────────────────────────
const sendOtp = async (
  userId: string,
  phone: string,
  purpose: OtpPurpose
): Promise<void> => {
  // Invalidate any previous unused OTPs for this user+purpose
  await OtpToken.deleteMany({ userId, purpose, used: false });

  const code      = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpToken.create({
    userId,
    phone,
    code: hashOtp(code),
    purpose,
    expiresAt,
  });

  await smsService.sendOTP(phone, code);
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
const verifyOtp = async (
  userId: string,
  code: string,
  purpose: OtpPurpose
): Promise<IOtpToken> => {
  const token = await OtpToken.findOne({
    userId,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!token) throw new Error('OTP not found or expired. Request a new one.');

  // Increment attempt counter
  token.attempts += 1;
  if (token.attempts > 5) {
    await token.save();
    throw new Error('Too many wrong attempts. Request a new OTP.');
  }

  if (token.code !== hashOtp(code)) {
    await token.save();
    throw new Error('Invalid OTP code.');
  }

  token.used = true;
  await token.save();
  return token;
};

// ─── Forgot password (Step 1 — send OTP) ────────────────────────────────────
export const forgotPassword = async (phone: string): Promise<void> => {
  const user = await User.findOne({ phone, isActive: true });
  // Always return success to prevent phone enumeration
  if (!user) return;

  await sendOtp(user._id.toString(), phone, OtpPurpose.PASSWORD_RESET);
};

// ─── Reset password (Step 2 — verify OTP + set new password) ────────────────
export const resetPassword = async (
  phone:       string,
  otpCode:     string,
  newPassword: string
): Promise<void> => {
  const user = await User.findOne({ phone, isActive: true }).select('+password');
  if (!user) throw new Error('User not found.');

  await verifyOtp(user._id.toString(), otpCode, OtpPurpose.PASSWORD_RESET);

  user.password = newPassword;       // pre-save hook hashes it
  await user.save();

  // Revoke all refresh sessions for security
  await RefreshSession.updateMany(
    { userId: user._id },
    { revoked: true, revokedAt: new Date(), revokedReason: 'Password reset' }
  );

  logInfo('Password reset successful', { userId: user._id });
};

// ─── Send phone verification OTP ─────────────────────────────────────────────
export const sendPhoneVerification = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found.');
  if (!user.phone) throw new Error('No phone number on account.');
  if (user.isPhoneVerified) throw new Error('Phone already verified.');

  await sendOtp(userId, user.phone, OtpPurpose.PHONE_VERIFY);
};

// ─── Verify phone OTP ────────────────────────────────────────────────────────
export const verifyPhone = async (
  userId:  string,
  otpCode: string
): Promise<void> => {
  await verifyOtp(userId, otpCode, OtpPurpose.PHONE_VERIFY);

  await User.findByIdAndUpdate(userId, { isPhoneVerified: true });
  logInfo('Phone verified', { userId });
};

// ─── Update profile ───────────────────────────────────────────────────────────
export const updateProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string }
): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found.');

  // If phone changes, reset verification
  if (data.phone && data.phone !== user.phone) {
    (user as any).isPhoneVerified = false;
  }

  if (data.firstName) user.firstName = data.firstName;
  if (data.lastName)  user.lastName  = data.lastName;
  if (data.phone)     user.phone     = data.phone;

  await user.save();
  return user;
};

// ─── Change password (authenticated) ─────────────────────────────────────────
export const changePassword = async (
  userId:          string,
  currentPassword: string,
  newPassword:     string
): Promise<void> => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new Error('User not found.');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new Error('Current password is incorrect.');

  user.password = newPassword;
  await user.save();

  logInfo('Password changed', { userId });
};

// needed for verifyOtp return type - import at top to avoid circular reference
import type { IOtpToken } from '../models/OtpToken';
