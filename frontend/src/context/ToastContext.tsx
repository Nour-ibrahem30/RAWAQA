'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'default' | 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (msg: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const ICON: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  default: '✦',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(20,50,20,.97)',   border: 'rgba(34,197,94,.35)',  icon: '#4ade80' },
  error:   { bg: 'rgba(50,15,15,.97)',   border: 'rgba(239,68,68,.35)',  icon: '#f87171' },
  info:    { bg: 'rgba(15,30,55,.97)',   border: 'rgba(96,165,250,.35)', icon: '#60a5fa' },
  default: { bg: 'rgba(21,19,15,.97)',   border: 'rgba(210,181,106,.3)', icon: '#D2B56A' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('default');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => setMessage(''), 300);
  }, []);

  const showToast = useCallback((msg: string, t: ToastType = 'default', duration = 3500) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setType(t);
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(hideToast, duration);
  }, [hideToast]);

  const c = COLORS[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Backdrop */}
      {message && (
        <div
          onClick={hideToast}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(2px)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 250ms ease',
            pointerEvents: visible ? 'auto' : 'none',
          }}
        />
      )}

      {/* Modal card */}
      {message && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: visible
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -48%) scale(.94)',
            zIndex: 9999,
            width: 'min(400px, 90vw)',
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 20,
            padding: '1.75rem 1.75rem 1.5rem',
            boxShadow: '0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 250ms ease, transform 280ms cubic-bezier(.34,1.3,.64,1)',
            pointerEvents: visible ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '.75rem',
            textAlign: 'center',
          }}
        >
          {/* Icon circle */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `${c.icon}18`,
            border: `1.5px solid ${c.icon}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            color: c.icon,
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}>
            {ICON[type]}
          </div>

          {/* Message */}
          <p style={{
            color: 'rgba(247,244,236,.9)',
            fontSize: '.925rem',
            lineHeight: 1.6,
            fontWeight: 500,
          }}>
            {message}
          </p>

          {/* Close button */}
          <button
            type="button"
            onClick={hideToast}
            style={{
              marginTop: '.25rem',
              padding: '.5rem 1.75rem',
              borderRadius: 999,
              background: `${c.icon}18`,
              border: `1px solid ${c.icon}44`,
              color: c.icon,
              fontSize: '.8rem',
              fontWeight: 600,
              letterSpacing: '.06em',
              cursor: 'pointer',
              transition: 'background 200ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = `${c.icon}30`)}
            onMouseLeave={e => (e.currentTarget.style.background = `${c.icon}18`)}
          >
            OK
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
