'use client';

import { useEffect, useState, useCallback } from 'react';
import { contentApi } from './api';

// ── Module-scope cache (per page load) ───────────────────────────────────────
const cache: Record<string, any> = {};

// ── BroadcastChannel for cross-tab real-time invalidation ───────────────────
// When admin saves content, they post a message here.
// All tabs (including storefront) that use useSiteContent will re-fetch.
export const CONTENT_CHANNEL = 'rawaqa_content_update';

export function broadcastContentUpdate(section: string) {
  try {
    const ch = new BroadcastChannel(CONTENT_CHANNEL);
    ch.postMessage({ section, ts: Date.now() });
    ch.close();
  } catch { /* BroadcastChannel not supported — no-op */ }
}

export function useSiteContent(section: string) {
  const [data, setData] = useState<Record<string, any>>(cache[section] || {});
  const [loaded, setLoaded] = useState(!!cache[section]);

  const refetch = useCallback(() => {
    contentApi.get(section)
      .then(r => {
        const d = r.data ?? {};
        cache[section] = d;
        setData(d);
      })
      .catch(() => { /* keep current */ })
      .finally(() => setLoaded(true));
  }, [section]);

  // Initial fetch
  useEffect(() => {
    if (cache[section]) {
      setData(cache[section]);
      setLoaded(true);
      return;
    }
    refetch();
  }, [section, refetch]);

  // Listen for cross-tab updates from admin
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(CONTENT_CHANNEL);
      ch.onmessage = (e: MessageEvent) => {
        if (e.data?.section === section || e.data?.section === '*') {
          delete cache[section]; // invalidate cache
          refetch();             // re-fetch from backend
        }
      };
      return () => ch.close();
    } catch { /* not supported */ }
  }, [section, refetch]);

  return { data, loaded, refetch };
}

// Helper: get localized string from content data
export function locContent(data: Record<string, any>, keyBase: string, locale: string): string {
  const arKey = `${keyBase}Ar`;
  const enKey = `${keyBase}En`;
  if (locale === 'ar') return data[arKey] || data[enKey] || '';
  return data[enKey] || data[arKey] || '';
}
