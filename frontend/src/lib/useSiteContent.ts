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

export function useSiteContent(section: string, initialData?: Record<string, any>) {
  const getInitial = () => {
    if (initialData && Object.keys(initialData).length > 0) {
      cache[section] = initialData;
      return initialData;
    }
    if (cache[section] && Object.keys(cache[section]).length > 0) {
      return cache[section];
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`rawaqa_content_${section}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          cache[section] = parsed;
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return {};
  };

  const [data, setData] = useState<Record<string, any>>(getInitial);
  const [loaded, setLoaded] = useState(() => Object.keys(getInitial()).length > 0);

  // If initialData arrives, sync state
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      cache[section] = initialData;
      setData(initialData);
      setLoaded(true);
    }
  }, [section, initialData]);

  const refetch = useCallback(() => {
    contentApi.get(section)
      .then(r => {
        const d = (r as any)?.data ?? r ?? {};
        if (d && Object.keys(d).length > 0) {
          cache[section] = d;
          try {
            localStorage.setItem(`rawaqa_content_${section}`, JSON.stringify(d));
          } catch { /* ignore */ }
          setData(d);
        }
      })
      .catch(() => { /* keep current */ })
      .finally(() => setLoaded(true));
  }, [section]);

  // Initial fetch / background revalidation
  useEffect(() => {
    refetch();
  }, [section, refetch]);

  // Listen for cross-tab updates from admin
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(CONTENT_CHANNEL);
      ch.onmessage = (e: MessageEvent) => {
        if (e.data?.section === section || e.data?.section === '*') {
          delete cache[section]; // invalidate cache
          try {
            const stored = localStorage.getItem(`rawaqa_content_${section}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              cache[section] = parsed;
              setData(parsed);
            }
          } catch { /* ignore */ }
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
