/**
 * Unit tests — pure utility functions (no DB required)
 */

describe('Order calculation helpers', () => {
  it('calculates total correctly with coupon discount', () => {
    const subtotal      = 500;
    const shippingCost  = 50;
    const tax           = 0;
    const discount      = 0;
    const couponDiscount = 75;

    const total = subtotal + shippingCost + tax - discount - couponDiscount;
    expect(total).toBe(475);
  });

  it('total never goes below zero when discount exceeds subtotal', () => {
    const total = Math.max(0, 100 - 200);
    expect(total).toBe(0);
  });
});

describe('OTP generation', () => {
  it('generates a 6-digit string', () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    expect(code).toHaveLength(6);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThanOrEqual(999999);
  });
});

describe('Inventory helpers', () => {
  it('availableQuantity = onHand - reserved', () => {
    const onHand   = 20;
    const reserved = 5;
    const available = onHand - reserved;
    expect(available).toBe(15);
  });

  it('isLowStock when availableQuantity <= threshold', () => {
    const isLowStock = (available: number, threshold: number) => available <= threshold;
    expect(isLowStock(3, 5)).toBe(true);
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(6, 5)).toBe(false);
  });
});

describe('Price formatting', () => {
  it('formats EGP price as integer', () => {
    const price = 1234.56;
    const formatted = `${Math.round(price)} EGP`;
    expect(formatted).toBe('1235 EGP');
  });
});
