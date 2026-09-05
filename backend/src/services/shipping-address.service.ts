import { ShippingAddress, IShippingAddress } from '../models/ShippingAddress';

const MAX_ADDRESSES = 5;

// ─── List user addresses ──────────────────────────────────────────────────────
export const getUserAddresses = async (userId: string): Promise<IShippingAddress[]> => {
  return ShippingAddress.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

// ─── Get single address ───────────────────────────────────────────────────────
export const getAddress = async (addressId: string, userId: string): Promise<IShippingAddress> => {
  const address = await ShippingAddress.findOne({ _id: addressId, user: userId });
  if (!address) throw new Error('Address not found');
  return address;
};

// ─── Add new address ──────────────────────────────────────────────────────────
export const addAddress = async (
  userId: string,
  data: Partial<IShippingAddress>
): Promise<IShippingAddress> => {
  // Max 5 addresses per user
  const count = await ShippingAddress.countDocuments({ user: userId });
  if (count >= MAX_ADDRESSES) {
    throw new Error(`Maximum ${MAX_ADDRESSES} addresses allowed per account`);
  }

  // If this is the first address, make it default
  const isDefault = count === 0 ? true : !!data.isDefault;

  // If setting as default, unset all other defaults first
  if (isDefault) {
    await ShippingAddress.updateMany({ user: userId }, { isDefault: false });
  }

  return ShippingAddress.create({ ...data, user: userId, isDefault });
};

// ─── Update address ───────────────────────────────────────────────────────────
export const updateAddress = async (
  addressId: string,
  userId: string,
  data: Partial<IShippingAddress>
): Promise<IShippingAddress> => {
  const address = await ShippingAddress.findOne({ _id: addressId, user: userId });
  if (!address) throw new Error('Address not found');

  // If setting as default, unset others first
  if (data.isDefault) {
    await ShippingAddress.updateMany(
      { user: userId, _id: { $ne: addressId } },
      { isDefault: false }
    );
  }

  Object.assign(address, data);
  await address.save();
  return address;
};

// ─── Delete address ───────────────────────────────────────────────────────────
export const deleteAddress = async (addressId: string, userId: string): Promise<void> => {
  const address = await ShippingAddress.findOne({ _id: addressId, user: userId });
  if (!address) throw new Error('Address not found');

  await address.deleteOne();

  // If deleted address was default, promote the most recent one
  if (address.isDefault) {
    const next = await ShippingAddress.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
};

// ─── Set default address ──────────────────────────────────────────────────────
export const setDefaultAddress = async (addressId: string, userId: string): Promise<IShippingAddress> => {
  const address = await ShippingAddress.findOne({ _id: addressId, user: userId });
  if (!address) throw new Error('Address not found');

  await ShippingAddress.updateMany({ user: userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();
  return address;
};
