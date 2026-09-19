import { SiteSettings, Ad, SiteContent, AdPlacement, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma';

export class ContentRepository {
  // ─── SiteSettings ──────────────────────────────────────────────

  async getSiteSettings(): Promise<SiteSettings> {
    const existing = await prisma.siteSettings.findUnique({
      where: { key: 'default' },
    });

    if (existing) return existing;

    return prisma.siteSettings.create({
      data: {
        key: 'default',
        colors: {
          charcoal: '#15130F',
          charcoalSoft: '#1E1B15',
          ivory: '#F7F4EC',
          ivory2: '#FDFCF9',
          sand: '#E8E0D2',
          gold: '#AD8A4C',
          goldLight: '#D2B56A',
          goldPale: '#E7D8B4',
          ink: '#262117',
          inkSoft: '#6E6656',
          clay: '#A8543A',
          indigo: '#3B5578',
          ochre: '#BE8F2E',
          forest: '#4B5B45',
          dune: '#C9A876',
        },
      },
    });
  }

  async updateSiteSettings(data: {
    colors: any;
    updatedBy?: string;
  }): Promise<SiteSettings> {
    return prisma.siteSettings.upsert({
      where: { key: 'default' },
      update: {
        colors: data.colors,
        updatedBy: data.updatedBy,
      },
      create: {
        key: 'default',
        colors: data.colors,
        updatedBy: data.updatedBy,
      },
    });
  }

  // ─── Ads ───────────────────────────────────────────────────────

  async findAdById(id: string): Promise<Ad | null> {
    return prisma.ad.findUnique({ where: { id } });
  }

  async findAds(params?: {
    placement?: AdPlacement;
    isActive?: boolean;
  }): Promise<Ad[]> {
    const now = new Date();
    const where: Prisma.AdWhereInput = {};

    if (params?.placement) {
      where.placement = params.placement;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
      if (params.isActive) {
        where.AND = [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ];
      }
    }

    return prisma.ad.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async createAd(data: {
    titleAr: string;
    titleEn: string;
    subtitleAr?: string;
    subtitleEn?: string;
    imageUrl: string;
    publicId?: string;
    linkUrl?: string;
    placement?: AdPlacement;
    isActive?: boolean;
    order?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Ad> {
    return prisma.ad.create({ data });
  }

  async updateAd(id: string, data: Prisma.AdUpdateInput): Promise<Ad> {
    return prisma.ad.update({
      where: { id },
      data,
    });
  }

  async deleteAd(id: string): Promise<void> {
    await prisma.ad.delete({ where: { id } });
  }

  // ─── Site Content ──────────────────────────────────────────────

  async getSiteContent(section: string): Promise<SiteContent | null> {
    return prisma.siteContent.findUnique({
      where: { section: section.trim() },
    });
  }

  async updateSiteContent(
    section: string,
    data: any,
    updatedBy?: string
  ): Promise<SiteContent> {
    const cleanSection = section.trim();
    return prisma.siteContent.upsert({
      where: { section: cleanSection },
      update: {
        data,
        updatedBy,
      },
      create: {
        section: cleanSection,
        data,
        updatedBy,
      },
    });
  }
}

export const contentRepository = new ContentRepository();

