'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'default' | 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (msg: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('default');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => setMessage(''), 350);
  }, []);

  const showToast = useCallback((msg: string, t: ToastType = 'default', duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setType(t);
    // Trigger visible on next tick to ensure CSS transition fires
    requestAnimationFrame(() => {
      setVisible(true);
    });

    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          onClick={hideToast}
          className={`toast ${type !== 'default' ? type : ''} ${visible ? 'show' : ''}`}
          role="alert"
          style={{ cursor: 'pointer' }}
        >
          <span>{message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
