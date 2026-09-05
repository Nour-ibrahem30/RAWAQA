import { Request, Response } from 'express';
import {
  applyCoupon, createCoupon, listCoupons,
  getCouponByCode, updateCoupon, deleteCoupon,
} from '../services/coupon.service';
import { logError } from '../config/logger';

// POST /api/coupons/apply
export const apply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, cartTotal, productIds } = req.body;
    if (!code || !cartTotal) {
      res.status(400).json({ success: false, message: 'code and cartTotal are required' });
      return;
    }
    const result = await applyCoupon({
      code, userId: req.user!.userId,
      cartTotal: Number(cartTotal), productIds,
    });
    res.json({
      success: true,
      data: {
        code:           result.coupon.code,
        type:           result.coupon.type,
        value:          result.coupon.value,
        discountAmount: result.discountAmount,
        finalTotal:     result.finalTotal,
      },
    });
  } catch (err) {
    logError('apply coupon error', err);
    const msg = err instanceof Error ? err.message : 'Failed to apply coupon';
    res.status(400).json({ success: false, message: msg });
  }
};

// GET /api/coupons  (admin)
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const page     = parseInt(req.query.page     as string) || 1;
    const limit    = parseInt(req.query.limit    as string) || 20;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true' : undefined;
    const result = await listCoupons(page, limit, isActive);
    res.json({
      success: true, data: result.coupons,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    logError('list coupons error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// GET /api/coupons/:code  (admin)
export const getByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code;
    if (!code) { res.status(400).json({ success: false, message: 'Code required' }); return; }
    const coupon = await getCouponByCode(code);
    if (!coupon) { res.status(404).json({ success: false, message: 'Coupon not found' }); return; }
    res.json({ success: true, data: coupon });
  } catch (err) {
    logError('getByCode error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
  }
};

// POST /api/coupons  (admin)
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await createCoupon(req.body, req.user!.userId);
    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (err) {
    logError('create coupon error', err);
    const msg = err instanceof Error ? err.message : 'Failed to create coupon';
    res.status(400).json({ success: false, message: msg });
  }
};

// PUT /api/coupons/:id  (admin)
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const coupon = await updateCoupon(id, req.body);
    res.json({ success: true, message: 'Coupon updated', data: coupon });
  } catch (err) {
    logError('update coupon error', err);
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
};

// DELETE /api/coupons/:id  (admin - soft deactivate)
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    await deleteCoupon(id);
    res.json({ success: true, message: 'Coupon deactivated' });
  } catch (err) {
    logError('delete coupon error', err);
    res.status(500).json({ success: false, message: 'Failed to deactivate coupon' });
  }
};
