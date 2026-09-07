import { Request, Response } from 'express';
import { Ad, AdPlacement } from '../models/Ad';
import { logError } from '../config/logger';
import { deleteFromCloudinary } from '../middleware/upload.middleware';

// ─── Public ────────────────────────────────────────────────────────────────────

/** GET /api/ads?placement=homepage_banner */
export const listAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const placement = req.query.placement as AdPlacement | undefined;
    const now = new Date();

    const query: any = { isActive: true };
    if (placement) query.placement = placement;

    // Respect date range if set
    query.$and = [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate:   null }, { endDate:   { $gte: now } }] },
    ];

    const ads = await Ad.find(query).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: ads });
  } catch (err) {
    logError('listAds error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────────

/** GET /api/admin/ads — all ads (including inactive) */
export const adminListAds = async (_req: Request, res: Response): Promise<void> => {
  try {
    const ads = await Ad.find().sort({ placement: 1, order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: ads });
  } catch (err) {
    logError('adminListAds error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
};

/** POST /api/admin/ads */
export const createAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { titleAr, titleEn, subtitleAr, subtitleEn, imageUrl, publicId, linkUrl, placement, isActive, order, startDate, endDate } = req.body;

    if (!titleAr || !titleEn || !imageUrl) {
      res.status(400).json({ success: false, message: 'titleAr, titleEn and imageUrl are required' });
      return;
    }

    const ad = await Ad.create({
      titleAr, titleEn, subtitleAr, subtitleEn,
      imageUrl, publicId, linkUrl,
      placement: placement || 'homepage_banner',
      isActive: isActive !== undefined ? isActive : true,
      order:    order ?? 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:   endDate   ? new Date(endDate)   : undefined,
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
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!ad) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }
    res.json({ success: true, data: ad });
  } catch (err) {
    logError('updateAd error', err);
    res.status(500).json({ success: false, message: 'Failed to update ad' });
  }
};

/** PATCH /api/admin/ads/:id/toggle — flip isActive */
export const toggleAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }
    ad.isActive = !ad.isActive;
    await ad.save();
    res.json({ success: true, data: { id: ad._id, isActive: ad.isActive } });
  } catch (err) {
    logError('toggleAd error', err);
    res.status(500).json({ success: false, message: 'Failed to toggle ad' });
  }
};

/** DELETE /api/admin/ads/:id */
export const deleteAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) { res.status(404).json({ success: false, message: 'Ad not found' }); return; }

    // Remove from Cloudinary if stored there
    if (ad.publicId) {
      await deleteFromCloudinary(ad.publicId).catch(() => {});
    }

    await ad.deleteOne();
    res.json({ success: true, message: 'Ad deleted' });
  } catch (err) {
    logError('deleteAd error', err);
    res.status(500).json({ success: false, message: 'Failed to delete ad' });
  }
};
