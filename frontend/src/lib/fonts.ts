import { Fraunces, Manrope, Cairo } from 'next/font/google';

// Fraunces — display headings only, minimal weights
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '600'],
  style: ['normal'],
  display: 'swap',
  preload: true,
});

// Manrope — UI body text
export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: true,
});

// Cairo — Arabic (covers both Latin and Arabic subsets)
// Dropped Noto Sans Arabic — Cairo covers all Arabic needs
export const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

export const fontClasses = [
  fraunces.variable,
  manrope.variable,
  cairo.variable,
].join(' ');
