import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { get, add, remove, toggle, check, clear } from '../controllers/wishlist.controller';

const router = Router();

router.use(authenticate);

router.get(   '/',                    get);     // GET    /api/wishlist
router.delete('/',                    clear);   // DELETE /api/wishlist
router.post(  '/:productId',          add);     // POST   /api/wishlist/:id
router.delete('/:productId',          remove);  // DELETE /api/wishlist/:id
router.post(  '/:productId/toggle',   toggle);  // POST   /api/wishlist/:id/toggle
router.get(   '/:productId/check',    check);   // GET    /api/wishlist/:id/check

export default router;
