/**
 * content.controller.ts — PostgreSQL/Prisma implementation
 * Uses contentRepository (Prisma-backed) instead of the Mongoose SiteContent model.
 * Business logic and API contract are identical.
 */
import { Request, Response } from 'express';
import { logError }           from '../config/logger';
import { contentRepository }  from '../repositories/content.repository';

// Default content for each section (fallback when DB has no record yet)
const DEFAULTS: Record<string, any> = {
  hero: {
    eyebrowAr: 'مصنوع في مصر',
    eyebrowEn: 'Made in Egypt',
    headlineAr: 'راحة حرفية.\nمصممة للحياة.',
    headlineEn: 'Crafted Comfort.\nDesigned for Life.',
    subAr: 'كراسي بين باج فاخرة مصممة للاسترخاء، للألعاب، للأطفال، وللهواء الطلق.',
    subEn: 'Premium bean bags designed for relaxing, gaming, kids, and outdoor living.',
    ctaShopAr: 'تسوق الآن',
    ctaShopEn: 'Shop Now',
    ctaDiscoverAr: 'اكتشف المجموعات',
    ctaDiscoverEn: 'Discover Collections',
    badgeAr: 'صنع في مصر 🇪🇬',
    badgeEn: 'Made in Egypt 🇪🇬',
    image: '/hero/hero-1.jpg',
  },
  about: {
    titleAr: 'مصنوع لحظات الحياة الحقيقية',
    titleEn: 'Made for Real Life Moments',
    bodyAr: 'كل كرسي رواقة يُصنع بعناية باستخدام مواد مختارة لتحمل الاستخدام اليومي مع الحفاظ على جماله وراحته لسنوات.',
    bodyEn: 'Every Rawaqa chair is handcrafted using selected materials built for daily use while maintaining its beauty and comfort for years.',
    ctaAr: 'اكتشف المجموعة',
    ctaEn: 'Explore Collection',
    image: '/hero/hero-1.jpg',
  },
  why: {
    titleAr: 'لماذا رواقة',
    titleEn: 'Why Rawaqa',
    points: [
      { titleAr: 'مواد عالية الجودة',    titleEn: 'Premium Materials',         bodyAr: 'جلد ناعم وإسفنج عالي الكثافة لراحة تدوم.',                     bodyEn: 'Soft leather and high-density foam for lasting comfort.' },
      { titleAr: 'تصميم مصري أصيل',      titleEn: 'Authentic Egyptian Design', bodyAr: 'مستوحى من الجماليات المحلية، مصنوع بيد صانع ماهر.',            bodyEn: 'Inspired by local aesthetics, crafted by skilled artisans.' },
      { titleAr: 'شحن سريع',             titleEn: 'Fast Shipping',             bodyAr: 'التوصيل خلال ٣-٥ أيام عمل لجميع المحافظات.',                   bodyEn: 'Delivery in 3–5 business days across Egypt.' },
      { titleAr: 'دعم العملاء',          titleEn: 'Customer Support',          bodyAr: 'فريقنا متاح ٧ أيام في الأسبوع.',                               bodyEn: 'Our team is available 7 days a week.' },
      { titleAr: 'ضمان الرضا',           titleEn: 'Satisfaction Guarantee',    bodyAr: 'غير راضٍ؟ نضمن لك استرداد المبلغ خلال ١٤ يوماً.',              bodyEn: 'Not satisfied? We guarantee a refund within 14 days.' },
      { titleAr: 'توصيل سريع',           titleEn: 'Fast Delivery',             bodyAr: 'توصيل خلال ٣-٥ أيام عمل لجميع محافظات مصر.',                  bodyEn: 'Delivery in 3–5 business days to all Egyptian governorates.' },
    ],
  },
  stats: {
    items: [
      { num: '500+', labelAr: 'عميل سعيد',    labelEn: 'Happy Clients' },
      { num: '4.9★', labelAr: 'تقييم العملاء', labelEn: 'Customer Rating' },
      { num: '100%', labelAr: 'صنع في مصر',   labelEn: 'Made in Egypt' },
    ],
  },
  cta: {
    titleAr: 'ابدأ رحلة راحتك',
    titleEn: 'Start Your Comfort Journey',
    subAr: 'اختر من مجموعتنا المميزة واجعل منزلك مكاناً للراحة الحقيقية.',
    subEn: 'Choose from our premium collection and make your home a place of true comfort.',
    btnAr: 'تسوق الآن',
    btnEn: 'Shop Now',
  },
  footer: {
    taglineAr: 'راحة حرفية. مصممة للحياة.',
    taglineEn: 'Crafted Comfort. Designed for Life.',
    phone: '+20 XXX XXX XXXX',
    email: 'hello@rawaqa.com',
    address: 'القاهرة، مصر',
  },
};

// ─── Public ────────────────────────────────────────────────────────────────────

export const getContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const section = req.params['section']!;
    const doc  = await contentRepository.getSiteContent(section);
    const data = (doc?.data as any) ?? (DEFAULTS as any)[section] ?? {};
    res.json({ success: true, data });
  } catch (err) {
    logError('getContent error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch content' });
  }
};

export const getAllContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Prisma doesn't have a findAll helper — we use findMany through raw prisma
    const { prisma } = await import('../lib/prisma');
    const docs = await prisma.siteContent.findMany();
    const result: Record<string, any> = { ...DEFAULTS };
    docs.forEach((d: any) => { result[d.section] = d.data; });
    res.json({ success: true, data: result });
  } catch (err) {
    logError('getAllContent error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch content' });
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────────

export const updateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const section = req.params['section']!;
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, message: 'data object is required' });
      return;
    }
    const doc = await contentRepository.updateSiteContent(section, data, req.user?.userId);
    res.json({ success: true, data: (doc.data as any) });
  } catch (err) {
    logError('updateContent error', err);
    res.status(500).json({ success: false, message: 'Failed to update content' });
  }
};

export const adminGetAllContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('../lib/prisma');
    const docs = await prisma.siteContent.findMany();
    const result: Record<string, any> = {};
    Object.keys(DEFAULTS).forEach(section => {
      const doc = docs.find((d: any) => d.section === section);
      result[section] = doc ? (doc.data as any) : DEFAULTS[section];
    });
    res.json({ success: true, data: result, sections: Object.keys(DEFAULTS) });
  } catch (err) {
    logError('adminGetAllContent error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch content' });
  }
};

// ─── Settings (via admin.controller) ────────────────────────────────────────

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await contentRepository.getSiteSettings();
    res.json({ success: true, data: settings.colors });
  } catch (err) {
    logError('getSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { colors } = req.body;
    if (!colors || typeof colors !== 'object') {
      res.status(400).json({ success: false, message: 'colors object is required' });
      return;
    }
    const settings = await contentRepository.updateSiteSettings({
      colors,
      updatedBy: req.user?.userId,
    });
    res.json({ success: true, data: settings.colors });
  } catch (err) {
    logError('updateSettings error', err);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
