import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getSessions,
  getCurrentUser,
  forgotPasswordHandler,
  resetPasswordHandler,
  sendPhoneOtpHandler,
  verifyPhoneHandler,
  updateProfileHandler,
  changePasswordHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../middleware/validation';
import { env } from '../config/env';

const router = Router();

// Rate limiter for auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', validate(refreshTokenSchema), refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current device
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, getSessions);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser);

// ─── Password Reset (public) ─────────────────────────────────────────────────
router.post('/forgot-password',  authLimiter, forgotPasswordHandler);
router.post('/reset-password',   authLimiter, resetPasswordHandler);

// ─── Phone Verification (authenticated) ──────────────────────────────────────
router.post('/send-phone-otp',   authenticate, sendPhoneOtpHandler);
router.post('/verify-phone',     authenticate, verifyPhoneHandler);

// ─── Profile & Password (authenticated) ──────────────────────────────────────
router.put('/profile',           authenticate, updateProfileHandler);
router.put('/change-password',   authenticate, changePasswordHandler);

export default router;
