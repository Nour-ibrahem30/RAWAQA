'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import AdminLoadingScreen from '@/components/ui/AdminLoadingScreen';
import '../globals.css';

// ── i18n strings for admin UI ─────────────────────────────────────────────
const UI: Record<string, Record<string, string>> = {
  en: {
    dashboard:    'Dashboard',
    products:     'Products',
    categories:   'Categories',
    orders:       'Orders',
    reviews:      'Reviews',
    coupons:      'Coupons',
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
    reviews:      'التقييمات',
    coupons:      'الكوبونات',
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
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Read localStorage only on client after hydration
  useEffect(() => {
    const stored = localStorage.getItem('rawaqa_admin_lang') as 'en' | 'ar' | null;
    if (stored === 'ar') setLang('ar');
    const storedTheme = localStorage.getItem('rawaqa_admin_theme') as 'dark' | 'light' | null;
    if (storedTheme === 'light') setTheme('light');
  }, []);

  const t   = UI[lang];
  const isAr = lang === 'ar';

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('rawaqa_admin_lang', next);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rawaqa_admin_theme', next);
  };

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/ar/login');
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  if (isLoading || !isAdmin) {
    return <AdminLoadingScreen lang={lang} isPersistent userName={user?.name || (isAr ? 'المشرف' : 'Admin')} />;
  }

  const navItems = [
    { href: '/admin',            icon: '⌂',  label: t.dashboard  },
    { href: '/admin/products',   icon: '⊞',  label: t.products   },
    { href: '/admin/categories', icon: '◈',  label: t.categories },
    { href: '/admin/orders',     icon: '✦',  label: t.orders     },
    { href: '/admin/reviews',    icon: '★',  label: t.reviews    },
    { href: '/admin/coupons',    icon: '🏷️', label: t.coupons    },
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
      data-admin-theme={theme}
      className="min-h-screen flex"
      style={{
        background: 'var(--admin-bg)',
        color: 'var(--admin-text)',
        fontFamily: 'var(--font-manrope, sans-serif)',
        transition: 'background 300ms ease, color 300ms ease',
      }}
    >
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-40 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : isAr ? 'translate-x-full' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
        style={{
          width: 240,
          background: 'var(--admin-bg-soft)',
          [isAr ? 'borderLeft' : 'borderRight']: '1px solid var(--admin-border)',
          [isAr ? 'right' : 'left']: 0,
        }}
      >
        {/* Logo + Lang toggle */}
        <div
          className="flex items-center justify-between px-4 py-5 border-b"
          style={{ borderColor: 'var(--admin-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" stroke="var(--admin-text-dim)" strokeWidth="1.1" />
              <path d="M18 36c0-9 5-16 12-16s12 7 12 16c0 4-5 6-12 6s-12-2-12-6z" stroke="var(--admin-gold)" strokeWidth="1.4" />
            </svg>
            <div>
              <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1rem', letterSpacing: '.12em', color: 'var(--admin-text)' }}>RAWAQA</p>
              <p style={{ fontSize: '.62rem', letterSpacing: '.1em', color: 'var(--admin-text-faint)', textTransform: 'uppercase' }}>
                {t.admin}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.4rem' }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              style={{
                background: 'var(--admin-active-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 8,
                padding: '.25rem .45rem',
                cursor: 'pointer',
                color: 'var(--admin-gold)',
                fontSize: '.8rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              title={lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'}
              style={{
                background: 'var(--admin-active-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 8,
                padding: '.25rem .5rem',
                cursor: 'pointer',
                color: 'var(--admin-gold)',
                fontSize: '.65rem',
                fontWeight: 700,
                letterSpacing: '.06em',
                flexShrink: 0,
              }}
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
          </div>
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
                background: isActive(item.href) ? 'var(--admin-active-bg)' : 'transparent',
                color: isActive(item.href) ? 'var(--admin-gold)' : 'var(--admin-text-dim)',
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
            borderColor: 'var(--admin-border)',
            textAlign: isAr ? 'right' : 'left',
          }}
        >
          <p style={{ fontSize: '.75rem', color: 'var(--admin-text-dim)', marginBottom: 4 }}>{user?.email}</p>
          <button
            onClick={() => logout().then(() => router.push('/ar/login'))}
            style={{ fontSize: '.72rem', color: 'var(--admin-text-faint)', letterSpacing: '.05em' }}
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
          style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border-sm)' }}
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
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
