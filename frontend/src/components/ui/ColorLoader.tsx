'use client';

import { useEffect } from 'react';
import { applyColors } from '@/lib/utils';
import { DEFAULT_COLORS } from '@/lib/types';

export default function ColorLoader() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rawaqa_site_colors');
      if (saved) {
        const colors = { ...DEFAULT_COLORS, ...JSON.parse(saved) };
        applyColors(colors as Record<string, string>);
      }
    } catch { /* ignore */ }
  }, []);

  return null;
}
