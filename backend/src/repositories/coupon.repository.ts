import { Coupon, CouponUsage, CouponType, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type CouponWithRelations = Coupon & {
  applicableProducts?: Array<{ id: string }>;
  applicableCategories?: Array<{ id: string }>;
};

export class CouponRepository {
  async findByCode(code: string): Promise<CouponWithRelations | null> {
    return prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        applicableProducts: { select: { id: true } },
        applicableCategories: { select: { id: true } },
      },
    });
  }

  async findById(id: string): Promise<CouponWithRelations | null> {
    return prisma.coupon.findUnique({
      where: { id },
      include: {
        applicableProducts: { select: { id: true } },
        applicableCategories: { select: { id: true } },
      },
    });
  }

  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.CouponWhereInput;
    orderBy?: Prisma.CouponOrderByWithRelationInput;
  }): Promise<CouponWithRelations[]> {
    return prisma.coupon.findMany({
      skip: params?.skip,
      take: params?.take,
      where: params?.where,
      orderBy: params?.orderBy ?? { createdAt: 'desc' },
      include: {
        applicableProducts: { select: { id: true } },
        applicableCategories: { select: { id: true } },
      },
    });
  }

  async count(where?: Prisma.CouponWhereInput): Promise<number> {
    return prisma.coupon.count({ where });
  }

  async create(data: {
    code: string;
    type: CouponType;
    value: Prisma.Decimal | number;
    minOrderValue?: Prisma.Decimal | number;
    maxDiscount?: Prisma.Decimal | number;
    usageLimit?: number;
    perUserLimit?: number;
    isActive?: boolean;
    expiresAt?: Date;
    createdById: string;
    applicableProductIds?: string[];
    applicableCategoryIds?: string[];
  }): Promise<Coupon> {
    const { applicableProductIds, applicableCategoryIds, ...rest } = data;

    return prisma.coupon.create({
      data: {
        ...rest,
        code: data.code.toUpperCase().trim(),
        applicableProducts: applicableProductIds && applicableProductIds.length > 0
          ? { connect: applicableProductIds.map((id) => ({ id })) }
          : undefined,
        applicableCategories: applicableCategoryIds && applicableCategoryIds.length > 0
          ? { connect: applicableCategoryIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.CouponUpdateInput
  ): Promise<Coupon> {
    return prisma.coupon.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.coupon.delete({ where: { id } });
  }

  async getUserUsageCount(couponId: string, userId: string): Promise<number> {
    return prisma.couponUsage.count({
      where: { couponId, userId },
    });
  }

  async recordUsage(
    data: {
      couponId: string;
      userId: string;
      orderId: string;
      discount: Prisma.Decimal | number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<CouponUsage> {
    const client = tx ?? prisma;
    await client.coupon.update({
      where: { id: data.couponId },
      data: { usedCount: { increment: 1 } },
    });

    return client.couponUsage.create({
      data: {
        couponId: data.couponId,
        userId: data.userId,
        orderId: data.orderId,
        discount: data.discount,
      },
    });
  }
}

export const couponRepository = new CouponRepository();

