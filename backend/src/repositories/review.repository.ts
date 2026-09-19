import { Review, User, Product, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type ReviewWithUser = Review & {
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
};

export class ReviewRepository {
  async findById(id: string): Promise<(Review & { user?: User; product?: Product }) | null> {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
      },
    });
  }

  async findByProductAndUser(productId: string, userId: string): Promise<Review | null> {
    return prisma.review.findUnique({
      where: {
        productId_userId: { productId, userId },
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ReviewWhereInput;
    orderBy?: Prisma.ReviewOrderByWithRelationInput;
  }): Promise<ReviewWithUser[]> {
    return prisma.review.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async count(where?: Prisma.ReviewWhereInput): Promise<number> {
    return prisma.review.count({ where });
  }

  async create(data: {
    productId: string;
    userId: string;
    orderId?: string;
    rating: number;
    titleAr?: string;
    titleEn?: string;
    comment: string;
    isVerifiedPurchase?: boolean;
    isApproved?: boolean;
  }): Promise<Review> {
    return prisma.review.create({ data });
  }

  async update(id: string, data: Prisma.ReviewUpdateInput): Promise<Review> {
    return prisma.review.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.review.delete({ where: { id } });
  }

  async voteHelpful(id: string): Promise<void> {
    await prisma.review.update({
      where: { id },
      data: { helpfulVotes: { increment: 1 } },
    });
  }

  async getRatingStats(productId: string): Promise<{
    avgRating: number;
    totalCount: number;
    distribution: Record<number, number>;
  }> {
    const [aggregates, dist] = await Promise.all([
      prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId, isApproved: true },
        _count: { id: true },
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) {
      distribution[d.rating] = d._count.id;
    }

    return {
      avgRating: Math.round((aggregates._avg.rating ?? 0) * 10) / 10,
      totalCount: aggregates._count.id,
      distribution,
    };
  }
}

export const reviewRepository = new ReviewRepository();

