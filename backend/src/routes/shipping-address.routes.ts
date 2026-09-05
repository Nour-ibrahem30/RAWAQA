import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { list, add, update, remove, setDefault } from '../controllers/shipping-address.controller';
import { validate, addShippingAddressSchema } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get(   '/',           list);
router.post(  '/',           validate(addShippingAddressSchema as any), add);
router.put(   '/:id',        validate(addShippingAddressSchema as any), update);
router.delete('/:id',        remove);
router.put(   '/:id/default',setDefault);

export default router;
