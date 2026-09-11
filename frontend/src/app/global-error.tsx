'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body style={{
        background: '#0d0b08',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#F7F4EC',
        gap: '1.5rem',
        padding: '2rem',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D2B56A" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          حدث خطأ غير متوقع
        </h2>
        <p style={{ color: 'rgba(247,244,236,.45)', fontSize: '.875rem', margin: 0, textAlign: 'center' }}>
          Something went wrong. The error has been reported automatically.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#D2B56A', color: '#15130F',
            border: 'none', borderRadius: 999, padding: '.65rem 1.5rem',
            fontWeight: 700, fontSize: '.875rem', cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
