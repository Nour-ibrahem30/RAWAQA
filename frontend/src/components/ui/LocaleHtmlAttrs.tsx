'use client';

import { useEffect } from 'react';

/**
 * Sets lang, dir, and font class-names on <html> and <body> at the client level.
 * This sidesteps the Next.js restriction that only the Root Layout can return <html>/<body>,
 * while still allowing locale-specific attributes.
 */
export default function LocaleHtmlAttrs({
  locale,
  fontClasses,
}: {
  locale: string;
  fontClasses: string;
}) {
  useEffect(() => {
    const html = document.documentElement;

    html.setAttribute('lang', locale);
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

    // Apply font CSS variable classes
    fontClasses.split(' ').forEach((cls) => {
      if (cls) html.classList.add(cls);
    });

    // Remove previously set direction class when locale changes
    return () => {
      html.removeAttribute('lang');
      html.removeAttribute('dir');
    };
  }, [locale, fontClasses]);

  return null;
}
