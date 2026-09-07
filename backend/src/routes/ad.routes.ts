import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { listAds, adminListAds, createAd, updateAd, toggleAd, deleteAd } from '../controllers/ad.controller';

const router = Router();

/**
 * @route GET /api/ads
 * @desc  Public — active ads (optional ?placement= filter)
 */
router.get('/', listAds);

export const adminAdRoutes = Router();

adminAdRoutes.use(authenticate, requireAdmin);

/**
 * @route GET    /api/admin/ads
 * @route POST   /api/admin/ads
 * @route PUT    /api/admin/ads/:id
 * @route PATCH  /api/admin/ads/:id/toggle
 * @route DELETE /api/admin/ads/:id
 */
adminAdRoutes.get('/',              adminListAds);
adminAdRoutes.post('/',             createAd);
adminAdRoutes.put('/:id',           updateAd);
adminAdRoutes.patch('/:id/toggle',  toggleAd);
adminAdRoutes.delete('/:id',        deleteAd);

export default router;
