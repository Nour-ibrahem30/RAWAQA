import { User, RefreshSession, OtpToken, ShippingAddress, UserRole, AuthProvider, OtpPurpose, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /** findByEmail but includes the hashed password field */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /** findById but includes the hashed password field */
  async findByIdWithPassword(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { phone } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async create(data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
    authProvider?: AuthProvider;
    googleId?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return prisma.user.findMany(params);
  }

  // ─── Refresh Sessions ──────────────────────────────────────────

  async createRefreshSession(data: {
    sessionId: string;
    userId: string;
    tokenHash: string;
    deviceInfo?: any;
    expiresAt: Date;
  }): Promise<RefreshSession> {
    return prisma.refreshSession.create({ data });
  }

  async findRefreshSession(sessionId: string): Promise<RefreshSession | null> {
    return prisma.refreshSession.findUnique({ where: { sessionId } });
  }

  async revokeRefreshSession(sessionId: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { sessionId },
      data: { revoked: true },
    });
  }

  async revokeRefreshSessionWithReason(sessionId: string, reason: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { sessionId },
      data: { revoked: true },
    });
    // Reason stored in logs — Prisma schema has no revokedReason field currently
    void reason;
  }

  async updateRefreshSession(sessionId: string, data: { tokenHash?: string; lastUsedAt?: Date; deviceInfo?: any }): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { sessionId },
      data,
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await prisma.refreshSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  // ─── OTP Tokens ────────────────────────────────────────────────

  async createOtpToken(data: {
    userId: string;
    code: string;
    purpose: OtpPurpose;
    phone?: string;
    email?: string;
    expiresAt: Date;
  }): Promise<OtpToken> {
    return prisma.otpToken.create({ data });
  }

  async findValidOtpToken(params: {
    userId: string;
    purpose: OtpPurpose;
  }): Promise<OtpToken | null> {
    return prisma.otpToken.findFirst({
      where: {
        userId: params.userId,
        purpose: params.purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markOtpUsed(id: string): Promise<void> {
    await prisma.otpToken.update({
      where: { id },
      data: { used: true },
    });
  }

  async incrementOtpAttempts(id: string): Promise<OtpToken> {
    return prisma.otpToken.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  // ─── Shipping Addresses ────────────────────────────────────────

  async findAddressesByUserId(userId: string): Promise<ShippingAddress[]> {
    return prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAddressById(id: string): Promise<ShippingAddress | null> {
    return prisma.shippingAddress.findUnique({ where: { id } });
  }

  async createAddress(data: {
    userId: string;
    label?: string;
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    governorate: string;
    postalCode?: string;
    isDefault?: boolean;
  }): Promise<ShippingAddress> {
    if (data.isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId: data.userId },
        data: { isDefault: false },
      });
    }
    return prisma.shippingAddress.create({ data });
  }

  async updateAddress(
    id: string,
    userId: string,
    data: Prisma.ShippingAddressUpdateInput
  ): Promise<ShippingAddress> {
    if (data.isDefault === true) {
      await prisma.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return prisma.shippingAddress.update({ where: { id }, data });
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    await prisma.shippingAddress.delete({ where: { id, userId } });
  }

  // ─── Session helpers for auth.service ─────────────────────────

  async countActiveSessions(userId: string): Promise<number> {
    return prisma.refreshSession.count({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });
  }

  async revokeOldestSession(userId: string): Promise<void> {
    const oldest = await prisma.refreshSession.findFirst({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (oldest) {
      await prisma.refreshSession.update({
        where: { id: oldest.id },
        data:  { revoked: true },
      });
    }
  }

  async findActiveSessions(userId: string): Promise<RefreshSession[]> {
    return prisma.refreshSession.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── OTP helpers ───────────────────────────────────────────────

  async deleteOtpTokens(userId: string, purpose: OtpPurpose): Promise<void> {
    await prisma.otpToken.deleteMany({
      where: { userId, purpose, used: false },
    });
  }

  async findOtpByCode(code: string, purpose: OtpPurpose): Promise<OtpToken | null> {
    return prisma.otpToken.findFirst({
      where: { code, purpose, used: false, expiresAt: { gt: new Date() } },
    });
  }
}

export const userRepository = new UserRepository();

