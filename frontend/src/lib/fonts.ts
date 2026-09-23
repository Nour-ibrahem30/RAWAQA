import { Fraunces, Manrope, IBM_Plex_Sans_Arabic } from 'next/font/google';

// Fraunces — display headings only, minimal weights
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '600'],
  style: ['normal'],
  display: 'swap',
  preload: true,
});

// Manrope — UI body text (Latin)
export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: true,
});

// IBM Plex Sans Arabic
// ──────────────────────────────────────────────────────────────────
// Why this font for RAWAQA specifically:
//
// 1. WARMTH on dark backgrounds — humanist stroke contrast in the
//    Arabic letterforms reads beautifully against charcoal (#15130F).
//    Tajawal is geometric (cold); IBM Plex Arabic is humanist (warm).
//
// 2. VISUAL KINSHIP WITH FRAUNCES — Fraunces has editorial character
//    (optical quirks, ink traps). IBM Plex Arabic has subtle calligraphic
//    tension in its curves — they share a "crafted" feeling without
//    being a stylistic mismatch across scripts.
//
// 3. READABILITY AT ALL SIZES — works at 12px (cart labels) all the
//    way to 72px (hero display). Arabic weight 700/800 produces the
//    same visual mass as Fraunces 600 in Latin — headlines feel unified.
//
// 4. PREMIUM WITHOUT BEING OVERDONE — Noto Naskh is more traditional
//    but heavier to load. Cairo/Tajawal are overused in Egyptian e-commerce.
//    IBM Plex Arabic is distinctive and signals quality.
//
// 5. OPEN LICENSE, zero layout shift — subset 'arabic' only, no extra
//    Latin fallback needed since Manrope covers Latin.
// ──────────────────────────────────────────────────────────────────
export const cairo = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-cairo',          // preserved CSS variable name — zero call-site changes needed
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

export const fontClasses = [
  fraunces.variable,
  manrope.variable,
  cairo.variable,
].join(' ');
