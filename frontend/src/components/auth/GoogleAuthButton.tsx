'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: any) => void;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  locale: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export default function GoogleAuthButton({ locale, onSuccess, onError }: GoogleAuthButtonProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isAr = locale === 'ar';

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!response?.credential) return;
      setLoading(true);
      setLocalError(null);
      try {
        const res = await authApi.googleAuth(response.credential);
        const { accessToken, refreshToken, user } = res.data;
        login(accessToken, refreshToken, user as any);
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/${locale}`);
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          (isAr ? 'فشل تسجيل الدخول عبر Google' : 'Google sign-in failed');
        setLocalError(msg);
        if (onError) onError(msg);
      } finally {
        setLoading(false);
      }
    },
    [isAr, locale, login, onError, onSuccess, router]
  );

  // 1. Detect OAuth redirect callback via window.location.hash
  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash) return;

    if (hash.includes('id_token=') || hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const token = params.get('id_token') || params.get('access_token');
      if (token) {
        // Clean up hash from browser address bar
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        handleCredentialResponse({ credential: token });
      }
    } else if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorType = params.get('error');
      const errorDesc = params.get('error_description') || '';
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      let msg = isAr ? 'فشل تسجيل الدخول عبر Google' : 'Google sign-in failed';
      if (errorType === 'redirect_uri_mismatch') {
        const currentOrigin = window.location.origin;
        msg = isAr
          ? `يجب إضافة الرابط (${currentOrigin}/${locale}/login) إلى Authorized redirect URIs في Google Cloud Console.`
          : `Please add (${currentOrigin}/${locale}/login) to Authorized redirect URIs in Google Cloud Console.`;
      } else if (errorDesc) {
        msg = `${msg}: ${errorDesc}`;
      }
      setLocalError(msg);
      if (onError) onError(msg);
    }
  }, [handleCredentialResponse, isAr, locale, onError]);

  // 2. Load Google Identity Services SDK for One Tap
  useEffect(() => {
    if (!mounted || !clientId) return;

    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [clientId, handleCredentialResponse, mounted]);

  const redirectToGoogleOAuth = () => {
    if (typeof window === 'undefined') return;
    const redirectUri = `${window.location.origin}/${locale}/login`;
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=id_token%20token&scope=openid%20profile%20email&nonce=${Date.now()}`;
    window.location.href = oauthUrl;
  };

  const handleCustomClick = () => {
    if (loading) return;

    if (!clientId) {
      const msg = isAr
        ? 'يرجى إعداد NEXT_PUBLIC_GOOGLE_CLIENT_ID في إعدادات البيئة لتفعيل الدخول بحساب Google'
        : 'Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment to enable Google Sign-In';
      setLocalError(msg);
      if (onError) onError(msg);
      return;
    }

    setLoading(true);
    setLocalError(null);

    // Try Google prompt first; fallback to direct OAuth redirect if dismissed, blocked, or timed out
    if (window.google?.accounts?.id) {
      try {
        let responded = false;
        window.google.accounts.id.prompt((notification: any) => {
          responded = true;
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            redirectToGoogleOAuth();
          }
        });

        // If prompt does not trigger within 1.2s (e.g. FedCM cooldown/suppressed), redirect directly
        setTimeout(() => {
          if (!responded) {
            redirectToGoogleOAuth();
          }
        }, 1200);
        return;
      } catch (err) {
        console.warn('Google prompt failed, falling back to direct OAuth redirect:', err);
      }
    }

    redirectToGoogleOAuth();
  };

  if (!mounted) {
    return (
      <div className="w-full h-11 rounded-full border border-[rgba(210,181,106,.15)] bg-[rgba(255,255,255,.02)] opacity-50" />
    );
  }

  return (
    <div className="w-full relative flex flex-col items-center">
      {/* Luxury Styled Button */}
      <button
        type="button"
        onClick={handleCustomClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-full border transition-all duration-300 font-semibold text-xs sm:text-sm cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(35,31,24,.9) 0%, rgba(20,18,14,.95) 100%)',
          borderColor: 'rgba(210,181,106,.25)',
          color: 'var(--ivory)',
          boxShadow: '0 4px 15px rgba(0,0,0,.35)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--gold-light)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(210,181,106,.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(210,181,106,.25)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,.35)';
        }}
      >
        {loading ? (
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid var(--gold-light)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>
          {loading
            ? isAr
              ? 'جارٍ المتابعة مع Google...'
              : 'Connecting to Google...'
            : isAr
            ? 'المتابعة باستخدام Google'
            : 'Continue with Google'}
        </span>
      </button>

      {/* Immediate Visible Feedback / Error notice */}
      {localError && (
        <div
          style={{
            marginTop: '.75rem',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
            background: 'rgba(248,113,113,.1)',
            border: '1px solid rgba(248,113,113,.25)',
            borderRadius: 12,
            padding: '.6rem .8rem',
            animation: 'fadeSlideUp 300ms ease',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: '.78rem', color: '#f87171', lineHeight: 1.4, margin: 0 }}>
            {localError}
          </p>
        </div>
      )}
    </div>
  );
}