import { describe, it, expect } from 'vitest';
import { loc, formatPrice, orderStatusLabel, orderStatusColor } from '@/lib/utils';

describe('loc()', () => {
  it('returns Arabic string when locale is ar', () => {
    expect(loc('مرحبا', 'Hello', 'ar')).toBe('مرحبا');
  });

  it('returns English string when locale is en', () => {
    expect(loc('مرحبا', 'Hello', 'en')).toBe('Hello');
  });

  it('falls back to the other language when one is empty', () => {
    expect(loc('', 'Hello', 'ar')).toBe('Hello');
    expect(loc('مرحبا', '', 'en')).toBe('مرحبا');
  });
});

describe('formatPrice()', () => {
  it('formats price in Arabic with ج.م suffix', () => {
    const result = formatPrice(1500, 'ar');
    expect(result).toContain('ج.م');
    // Arabic locale uses Eastern Arabic numerals (١٥٠٠) — just check the suffix
    expect(result.length).toBeGreaterThan(3);
  });

  it('formats price in English with EGP prefix', () => {
    const result = formatPrice(1500, 'en');
    expect(result).toContain('EGP');
  });
});

describe('orderStatusLabel()', () => {
  it('returns Arabic label for ar locale', () => {
    expect(orderStatusLabel('pending', 'ar')).toBe('في الانتظار');
  });

  it('returns English label for en locale', () => {
    expect(orderStatusLabel('delivered', 'en')).toBe('Delivered');
  });

  it('returns the raw status string for unknown statuses', () => {
    expect(orderStatusLabel('unknown_status', 'en')).toBe('unknown_status');
  });
});

describe('orderStatusColor()', () => {
  it('returns green classes for delivered', () => {
    expect(orderStatusColor('delivered')).toContain('green');
  });

  it('returns red classes for cancelled', () => {
    expect(orderStatusColor('cancelled')).toContain('red');
  });

  it('returns a default class for unknown status', () => {
    expect(orderStatusColor('unknown')).toContain('gray');
  });
});
