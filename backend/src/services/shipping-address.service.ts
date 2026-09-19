import { userRepository } from '../repositories/user.repository';

const MAX_ADDRESSES = 5;

const formatAddress = (addr: any) => {
  if (!addr) return null;
  return {
    ...addr,
    _id: addr.id,
  };
};

// ─── List user addresses ──────────────────────────────────────────────────────
export const getUserAddresses = async (userId: string): Promise<any[]> => {
  const addresses = await userRepository.findAddressesByUserId(userId);
  return addresses.map(formatAddress);
};

// ─── Get single address ───────────────────────────────────────────────────────
export const getAddress = async (addressId: string, userId: string): Promise<any> => {
  const address = await userRepository.findAddressById(addressId);
  if (!address || address.userId !== userId) throw new Error('Address not found');
  return formatAddress(address);
};

// ─── Add new address ──────────────────────────────────────────────────────────
export const addAddress = async (
  userId: string,
  data: any
): Promise<any> => {
  const existing = await userRepository.findAddressesByUserId(userId);
  if (existing.length >= MAX_ADDRESSES) {
    throw new Error(`Maximum ${MAX_ADDRESSES} addresses allowed per account`);
  }

  // If this is the first address, make it default
  const isDefault = existing.length === 0 ? true : !!data.isDefault;

  const address = await userRepository.createAddress({
    userId,
    label: data.label || 'Home',
    recipientName: data.recipientName,
    phone: data.phone,
    streetAddress: data.streetAddress,
    city: data.city,
    governorate: data.governorate,
    postalCode: data.postalCode,
    isDefault,
  });

  return formatAddress(address);
};

// ─── Update address ───────────────────────────────────────────────────────────
export const updateAddress = async (
  addressId: string,
  userId: string,
  data: any
): Promise<any> => {
  const existing = await userRepository.findAddressById(addressId);
  if (!existing || existing.userId !== userId) throw new Error('Address not found');

  const updated = await userRepository.updateAddress(addressId, userId, {
    label: data.label !== undefined ? data.label : existing.label,
    recipientName: data.recipientName !== undefined ? data.recipientName : existing.recipientName,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    streetAddress: data.streetAddress !== undefined ? data.streetAddress : existing.streetAddress,
    city: data.city !== undefined ? data.city : existing.city,
    governorate: data.governorate !== undefined ? data.governorate : existing.governorate,
    postalCode: data.postalCode !== undefined ? data.postalCode : existing.postalCode,
    isDefault: data.isDefault !== undefined ? !!data.isDefault : existing.isDefault,
  });

  return formatAddress(updated);
};

// ─── Delete address ───────────────────────────────────────────────────────────
export const deleteAddress = async (addressId: string, userId: string): Promise<void> => {
  const address = await userRepository.findAddressById(addressId);
  if (!address || address.userId !== userId) throw new Error('Address not found');

  await userRepository.deleteAddress(addressId, userId);

  // If deleted address was default, promote the most recent one
  if (address.isDefault) {
    const remaining = await userRepository.findAddressesByUserId(userId);
    const next = remaining[0];
    if (next) {
      await userRepository.updateAddress(next.id, userId, { isDefault: true });
    }
  }
};

// ─── Set default address ──────────────────────────────────────────────────────
export const setDefaultAddress = async (addressId: string, userId: string): Promise<any> => {
  const address = await userRepository.findAddressById(addressId);
  if (!address || address.userId !== userId) throw new Error('Address not found');

  const updated = await userRepository.updateAddress(addressId, userId, { isDefault: true });
  return formatAddress(updated);
};
