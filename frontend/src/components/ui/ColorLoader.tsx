'use client';

import { useEffect } from 'react';
import { applyColors } from '@/lib/utils';
import { DEFAULT_COLORS } from '@/lib/types';
import { adminApi } from '@/lib/api';

const COLORS_CHANNEL = 'rawaqa_colors_update';
const STORAGE_KEY    = 'rawaqa_site_colors';

export default function ColorLoader() {
  useEffect(() => {
    // 1. Apply immediately from localStorage (instant paint, no flash)
    const applyFromStorage = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const colors = { ...DEFAULT_COLORS, ...JSON.parse(saved) };
          applyColors(colors as Record<string, string>);
        }
      } catch { /* ignore */ }
    };
    applyFromStorage();

    // 2. Then fetch from server (may override localStorage with latest)
    adminApi.getSettings()
      .then(r => {
        if (r.data && Object.keys(r.data).length > 0) {
          const merged = { ...DEFAULT_COLORS, ...r.data };
          // Persist to localStorage so next page load is instant
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          applyColors(merged as unknown as Record<string, string>);
        }
      })
      .catch(() => { /* keep localStorage version */ });

    // 3. Listen for live color updates broadcast from admin panel
    try {
      const ch = new BroadcastChannel(COLORS_CHANNEL);
      ch.onmessage = (e: MessageEvent) => {
        if (e.data?.colors) {
          const merged = { ...DEFAULT_COLORS, ...e.data.colors };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          applyColors(merged as Record<string, string>);
        }
      };
      return () => ch.close();
    } catch { /* not supported */ }
  }, []);

  return null;
}
