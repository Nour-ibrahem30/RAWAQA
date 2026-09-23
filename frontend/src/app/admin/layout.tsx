'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Image from 'next/image';
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

  // Nav icons as inline SVG components — each one reflects RAWAQA's product identity
  // (bean bags, home comfort, Egyptian craftsmanship, retail operations)
  const NavIcon = ({ id }: { id: string }) => {
    const icons: Record<string, React.ReactNode> = {
      // Dashboard — grid of 4 tiles (like a store overview)
      dashboard: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      ),
      // Products — bean bag silhouette (core product identity)
      products: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17c0-5 2.5-9 5-9s5 4 5 9c0 2-2.5 3-5 3s-5-1-5-3z"/>
          <path d="M10 8c.5-2 1.5-3 2-3"/>
        </svg>
      ),
      // Categories — layered collection / folders
      categories: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h5l2-3h6l2 3h3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"/>
          <circle cx="12" cy="13" r="2.5"/>
        </svg>
      ),
      // Orders — shopping bag with check (fulfillment)
      orders: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      // Reviews — speech bubble with star
      reviews: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <path d="M12 7l1 2.5 2.5.5-1.8 1.8.5 2.7L12 13.2l-2.2 1.3.5-2.7L8.5 10l2.5-.5z"/>
        </svg>
      ),
      // Coupons — ticket / discount tag
      coupons: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      ),
      // Customers — person silhouette (Egyptian family buyer)
      customers: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      // Ads — megaphone / broadcast
      ads: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l19-9-9 19-2-8-8-2z"/>
        </svg>
      ),
      // Content — document with pen (site copy & CMS)
      content: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      // Settings — sliders (theme, colors, brand)
      settings: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
          <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
        </svg>
      ),
    };
    return <span style={{ display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center', flexShrink: 0 }}>{icons[id]}</span>;
  };

  const navItems = [
    { href: '/admin',            id: 'dashboard',  label: t.dashboard  },
    { href: '/admin/products',   id: 'products',   label: t.products   },
    { href: '/admin/categories', id: 'categories', label: t.categories },
    { href: '/admin/orders',     id: 'orders',     label: t.orders     },
    { href: '/admin/reviews',    id: 'reviews',    label: t.reviews    },
    { href: '/admin/coupons',    id: 'coupons',    label: t.coupons    },
    { href: '/admin/customers',  id: 'customers',  label: t.customers  },
    { href: '/admin/ads',        id: 'ads',        label: t.ads        },
    { href: '/admin/content',    id: 'content',    label: t.content    },
    { href: '/admin/settings',   id: 'settings',   label: t.settings   },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      data-admin-theme={theme}
      data-theme="dark"
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
            {/* Real brand logo */}
            <div style={{
              width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
              border: '1px solid rgba(210,181,106,.25)',
              background: 'rgba(210,181,106,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image
                src="/logo.png"
                alt="RAWAQA"
                width={30}
                height={30}
                style={{ objectFit: 'contain', width: 30, height: 30 }}
                priority
              />
            </div>
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
              <NavIcon id={item.id} />
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
