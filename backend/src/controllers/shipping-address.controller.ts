import { Request, Response } from 'express';
import {
  getUserAddresses, addAddress, updateAddress,
  deleteAddress, setDefaultAddress,
} from '../services/shipping-address.service';
import { logError } from '../config/logger';

// GET /api/addresses
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const addresses = await getUserAddresses(req.user!.userId);
    res.json({ success: true, data: addresses });
  } catch (err) {
    logError('list addresses error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
  }
};

// POST /api/addresses
export const add = async (req: Request, res: Response): Promise<void> => {
  try {
    const address = await addAddress(req.user!.userId, req.body);
    res.status(201).json({ success: true, message: 'Address added', data: address });
  } catch (err) {
    logError('add address error', err);
    const msg = err instanceof Error ? err.message : 'Failed to add address';
    res.status(400).json({ success: false, message: msg });
  }
};

// PUT /api/addresses/:id
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const address = await updateAddress(id, req.user!.userId, req.body);
    res.json({ success: true, message: 'Address updated', data: address });
  } catch (err) {
    logError('update address error', err);
    const msg = err instanceof Error ? err.message : 'Failed to update address';
    res.status(err instanceof Error && err.message === 'Address not found' ? 404 : 400)
      .json({ success: false, message: msg });
  }
};

// DELETE /api/addresses/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    await deleteAddress(id, req.user!.userId);
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    logError('delete address error', err);
    res.status(404).json({ success: false, message: 'Address not found' });
  }
};

// PUT /api/addresses/:id/default
export const setDefault = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ success: false, message: 'ID required' }); return; }
    const address = await setDefaultAddress(id, req.user!.userId);
    res.json({ success: true, message: 'Default address updated', data: address });
  } catch (err) {
    logError('setDefault address error', err);
    res.status(404).json({ success: false, message: 'Address not found' });
  }
};
