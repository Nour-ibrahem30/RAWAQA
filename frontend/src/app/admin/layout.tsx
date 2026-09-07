'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import '../globals.css';

// ── i18n strings for admin UI ─────────────────────────────────────────────
const UI: Record<string, Record<string, string>> = {
  en: {
    dashboard:    'Dashboard',
    products:     'Products',
    categories:   'Categories',
    orders:       'Orders',
    customers:    'Customers',
    ads:          'Ads',
    content:      'Content',
    settings:     'Site Settings',
    viewSite:     '← View Site',
    signOut:      'Sign Out →',
    admin:        'Admin',
    loading:      'LOADING...',
  },
  ar: {
    dashboard:    'لوحة التحكم',
    products:     'المنتجات',
    categories:   'الأقسام',
    orders:       'الطلبات',
    customers:    'العملاء',
    ads:          'الإعلانات',
    content:      'المحتوى',
    settings:     'إعدادات الموقع',
    viewSite:     'عرض الموقع ←',
    signOut:      '← تسجيل الخروج',
    admin:        'المشرف',
    loading:      'جاري التحميل...',
  },
};

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isAdmin, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en'); // always start 'en' on server

  // Read localStorage only on client after hydration
  useEffect(() => {
    const stored = localStorage.getItem('rawaqa_admin_lang') as 'en' | 'ar' | null;
    if (stored === 'ar') setLang('ar');
  }, []);

  const t   = UI[lang];
  const isAr = lang === 'ar';

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('rawaqa_admin_lang', next);
  };

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/ar/login');
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0e0a' }}>
        <div className="text-center">
          <svg width="40" height="40" viewBox="0 0 60 60" fill="none" className="mx-auto mb-4 animate-pulse">
            <circle cx="30" cy="30" r="28" stroke="#D2B56A" strokeWidth="1.1" opacity=".5" />
            <path d="M18 36c0-9 5-16 12-16s12 7 12 16c0 4-5 6-12 6s-12-2-12-6z" stroke="#D2B56A" strokeWidth="1.4" />
          </svg>
          <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.8rem', letterSpacing: '.1em' }}>
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin',            icon: '⌂',  label: t.dashboard  },
    { href: '/admin/products',   icon: '⊞',  label: t.products   },
    { href: '/admin/categories', icon: '◈',  label: t.categories },
    { href: '/admin/orders',     icon: '✦',  label: t.orders     },
    { href: '/admin/customers',  icon: '◎',  label: t.customers  },
    { href: '/admin/ads',        icon: '📢', label: t.ads        },
    { href: '/admin/content',    icon: '✏️', label: t.content    },
    { href: '/admin/settings',   icon: '◐',  label: t.settings   },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen flex"
      style={{ background: '#0f0e0a', color: '#F7F4EC', fontFamily: 'var(--font-manrope, sans-serif)' }}
    >
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-40 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : isAr ? 'translate-x-full' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
        style={{
          width: 240,
          background: '#15130F',
          [isAr ? 'borderLeft' : 'borderRight']: '1px solid rgba(210,181,106,.12)',
          [isAr ? 'right' : 'left']: 0,
        }}
      >
        {/* Logo + Lang toggle */}
        <div
          className="flex items-center justify-between px-4 py-5 border-b"
          style={{ borderColor: 'rgba(210,181,106,.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" stroke="rgba(247,244,236,.4)" strokeWidth="1.1" />
              <path d="M18 36c0-9 5-16 12-16s12 7 12 16c0 4-5 6-12 6s-12-2-12-6z" stroke="#D2B56A" strokeWidth="1.4" />
            </svg>
            <div>
              <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1rem', letterSpacing: '.12em' }}>RAWAQA</p>
              <p style={{ fontSize: '.62rem', letterSpacing: '.1em', color: 'rgba(247,244,236,.3)', textTransform: 'uppercase' }}>
                {t.admin}
              </p>
            </div>
          </div>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'}
            style={{
              background: 'rgba(210,181,106,.1)',
              border: '1px solid rgba(210,181,106,.2)',
              borderRadius: 8,
              padding: '.25rem .5rem',
              cursor: 'pointer',
              color: '#D2B56A',
              fontSize: '.65rem',
              fontWeight: 700,
              letterSpacing: '.06em',
              flexShrink: 0,
            }}
          >
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all"
              style={{
                background: isActive(item.href) ? 'rgba(210,181,106,.12)' : 'transparent',
                color: isActive(item.href) ? '#D2B56A' : 'rgba(247,244,236,.6)',
                flexDirection: isAr ? 'row-reverse' : 'row',
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div
          className="px-4 py-4 border-t"
          style={{
            borderColor: 'rgba(210,181,106,.12)',
            textAlign: isAr ? 'right' : 'left',
          }}
        >
          <p style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.5)', marginBottom: 4 }}>{user?.email}</p>
          <button
            onClick={() => logout().then(() => router.push('/ar/login'))}
            style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.35)', letterSpacing: '.05em' }}
            className="hover:text-ivory transition-colors"
          >
            {t.signOut}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-20"
          style={{ background: '#0f0e0a', borderColor: 'rgba(210,181,106,.1)' }}
        >
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ color: 'rgba(247,244,236,.6)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <p className="text-sm font-medium" style={{ color: 'rgba(247,244,236,.5)' }}>
            {navItems.find(n => isActive(n.href))?.label || t.admin}
          </p>

          <div className="flex items-center gap-3">
            {/* Mobile lang toggle */}
            <button
              onClick={toggleLang}
              className="lg:hidden"
              style={{
                background: 'rgba(210,181,106,.1)',
                border: '1px solid rgba(210,181,106,.2)',
                borderRadius: 8,
                padding: '.25rem .5rem',
                cursor: 'pointer',
                color: '#D2B56A',
                fontSize: '.65rem',
                fontWeight: 700,
              }}
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>

            <Link
              href="/ar"
              style={{ fontSize: '.72rem', color: '#D2B56A', letterSpacing: '.05em' }}
            >
              {t.viewSite}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <AdminShell>{children}</AdminShell>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
