import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutCurrentDevice,
  logoutAllDevices,
  getUserActiveSessions,
  IDeviceInfo,
} from '../services/auth.service';
import { logError } from '../config/logger';
import { env } from '../config/env';

// Extract device info from request
const getDeviceInfo = (req: Request): IDeviceInfo => {
  return {
    userAgent: req.headers['user-agent'],
    ip: (req.ip || req.socket.remoteAddress) as string,
    platform: req.headers['sec-ch-ua-platform'] as string,
    browser: req.headers['sec-ch-ua'] as string,
  };
};

// Set token cookies
const setTokenCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    maxAge: 15 * 60 * 1000, // 15 minutes
    domain: env.COOKIE_DOMAIN,
  });

  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: env.COOKIE_DOMAIN,
  });
};

// Clear token cookies
const clearTokenCookies = (res: Response): void => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: env.COOKIE_DOMAIN,
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
    domain: env.COOKIE_DOMAIN,
  });
};

/**
 * POST /api/auth/register
 * Register new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const user = await registerUser({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logError('Registration error', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
};

/**
 * POST /api/auth/login
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const deviceInfo = getDeviceInfo(req);

    const result = await loginUser(email, password, deviceInfo);

    // Set cookies
    setTokenCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    logError('Login error', error);

    if (
      error instanceof Error &&
      (error.message.includes('Invalid') || error.message.includes('deactivated'))
    ) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Refresh token is required',
      });
      return;
    }

    const deviceInfo = getDeviceInfo(req);
    const tokens = await refreshTokens(refreshToken, deviceInfo);

    // Set new cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    logError('Refresh token error', error);

    if (
      error instanceof Error &&
      (error.message.includes('Invalid') ||
        error.message.includes('expired') ||
        error.message.includes('revoked'))
    ) {
      // Clear cookies on invalid refresh token
      clearTokenCookies(res);

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to refresh token',
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout current device
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    await logoutCurrentDevice(req.user.sessionId, req.user.userId);

    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logError('Logout error', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to logout',
    });
  }
};

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const count = await logoutAllDevices(req.user.userId);

    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: {
        sessionsRevoked: count,
      },
    });
  } catch (error) {
    logError('Logout all error', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to logout from all devices',
    });
  }
};

/**
 * GET /api/auth/sessions
 * Get user active sessions
 */
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const sessions = await getUserActiveSessions(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          deviceInfo: session.deviceInfo,
          issuedAt: session.issuedAt,
          lastUsedAt: session.lastUsedAt,
          expiresAt: session.expiresAt,
          isCurrent: session.sessionId === req.user?.sessionId,
        })),
      },
    });
  } catch (error) {
    logError('Get sessions error', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get sessions',
    });
  }
};

/**
 * GET /api/auth/me
 * Get current user
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    logError('Get current user error', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get current user',
    });
  }
};

import {
  forgotPassword,
  resetPassword,
  sendPhoneVerification,
  verifyPhone,
  updateProfile,
  changePassword,
} from '../services/auth.service';

// POST /api/auth/forgot-password
export const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone) { res.status(400).json({ success: false, message: 'Phone number is required' }); return; }
    await forgotPassword(phone);
    // Always return success to prevent phone enumeration
    res.json({ success: true, message: 'If this phone is registered, an OTP has been sent' });
  } catch (err) {
    logError('forgotPassword error', err);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

// POST /api/auth/reset-password
export const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'phone, otp, and newPassword are required' });
      return;
    }
    await resetPassword(phone, otp, newPassword);
    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    logError('resetPassword error', err);
    const msg = err instanceof Error ? err.message : 'Failed to reset password';
    res.status(400).json({ success: false, message: msg });
  }
};

// POST /api/auth/send-phone-otp
export const sendPhoneOtpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    await sendPhoneVerification(req.user!.userId);
    res.json({ success: true, message: 'OTP sent to your phone number' });
  } catch (err) {
    logError('sendPhoneOtp error', err);
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    res.status(400).json({ success: false, message: msg });
  }
};

// POST /api/auth/verify-phone
export const verifyPhoneHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otp } = req.body;
    if (!otp) { res.status(400).json({ success: false, message: 'OTP is required' }); return; }
    await verifyPhone(req.user!.userId, otp);
    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (err) {
    logError('verifyPhone error', err);
    const msg = err instanceof Error ? err.message : 'Verification failed';
    res.status(400).json({ success: false, message: msg });
  }
};

// PUT /api/auth/profile
export const updateProfileHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await updateProfile(req.user!.userId, { firstName, lastName, phone });
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (err) {
    logError('updateProfile error', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// PUT /api/auth/change-password
export const changePasswordHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
      return;
    }
    await changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    logError('changePassword error', err);
    const msg = err instanceof Error ? err.message : 'Failed to change password';
    res.status(400).json({ success: false, message: msg });
  }
};
