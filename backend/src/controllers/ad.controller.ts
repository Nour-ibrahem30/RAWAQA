/**
 * ad.controller.ts — PostgreSQL/Prisma implementation
 * Uses contentRepository (Prisma-backed) instead of the Mongoose Ad model.
 * Business logic and API contract are identical.
 */
import { Request, Response } from 'express';
import { logError }           from '../config/logger';
import { contentRepository }  from '../repositories/content.repository';
import { deleteFromCloudinary } from '../middleware/upload.middleware';
import type { AdPlacement }   from '../generated/prisma/client';

// ─── Public ────────────────────────────────────────────────────────────────────

/** GET /api/ads?placement=homepage_banner */
export const listAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const placement = req.query.placement as AdPlacement | undefined;
    const ads = await contentRepository.findAds({ placement, isActive: true });
    res.json({ success: true, data: ads });
  } catch (err) {
    logError('listAds error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────────

/** GET /api/admin/ads */
export const adminListAds = async (_req: Request, res: Response): Promise<void> => {
  try {
    const ads = await contentRepository.findAds();
    res.json({ success: true, data: ads });
  } catch (err) {
    logError('adminListAds error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
};

/** POST /api/admin/ads */
export const createAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { titleAr, titleEn, subtitleAr, subtitleEn, imageUrl, publicId, linkUrl,
            placement, isActive, order, startDate, endDate } = req.body;

    if (!titleAr || !titleEn || !imageUrl) {
      res.status(400).json({ success: false, message: 'titleAr, titleEn and imageUrl are required' });
      return;
    }

    const ad = await contentRepository.createAd({
      titleAr, titleEn, subtitleAr, subtitleEn,
      imageUrl, publicId, linkUrl,
      placement:  (placement || 'homepage_banner') as AdPlacement,
      isActive:   isActive !== undefined ? isActive : true,
      order:      order ?? 0,
      startDate:  startDate ? new Date(startDate) : undefined,
      endDate:    endDate   ? new Date(endDate)   : undefined,
    });

    res.status(201).json({ success: true, data: ad });
  } catch (err) {
    logError('createAd error', err);
    res.status(500).json({ success: false, message: 'Failed to create ad' });
  }
};

/** PUT /api/admin/ads/:id */
export const updateAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const ad = await contentRepository.updateAd(req.params['id']!, req.body);
    if (!ad) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }
    res.json({ success: true, data: ad });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Ad not found' });
      return;
    }
    logError('updateAd error', err);
    res.status(500).json({ success: false, message: 'Failed to update ad' });
  }
};

/** PATCH /api/admin/ads/:id/toggle */
export const toggleAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await contentRepository.findAdById(req.params['id']!);
    if (!existing) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }

    const updated = await contentRepository.updateAd(req.params['id']!, { isActive: !existing.isActive });
    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (err) {
    logError('toggleAd error', err);
    res.status(500).json({ success: false, message: 'Failed to toggle ad' });
  }
};

/** DELETE /api/admin/ads/:id */
export const deleteAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await contentRepository.findAdById(req.params['id']!);
    if (!existing) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }

    if (existing.publicId) {
      await deleteFromCloudinary(existing.publicId).catch(() => {});
    }

    await contentRepository.deleteAd(req.params['id']!);
    res.json({ success: true, message: 'Ad deleted' });
  } catch (err) {
    logError('deleteAd error', err);
    res.status(500).json({ success: false, message: 'Failed to delete ad' });
  }
};
