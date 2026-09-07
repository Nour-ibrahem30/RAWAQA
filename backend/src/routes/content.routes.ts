import { Router } from 'express';
import { getContent, getAllContent } from '../controllers/content.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { updateContent, adminGetAllContent } from '../controllers/content.controller';

// ── Public ─────────────────────────────────────────────────────────────────────
const router = Router();
router.get('/',         getAllContent);
router.get('/:section', getContent);

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminContentRoutes = Router();
adminContentRoutes.use(authenticate, requireAdmin);
adminContentRoutes.get('/',           adminGetAllContent);
adminContentRoutes.put('/:section',   updateContent);

export default router;
