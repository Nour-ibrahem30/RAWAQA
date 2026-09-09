'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const t = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const otherLocale = locale === 'ar' ? 'en' : 'ar';

  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLocale = () => {
    const path = window.location.pathname.replace(`/${locale}`, `/${otherLocale}`);
    router.push(path || `/${otherLocale}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}`);
    setMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-[6vw] transition-all duration-300 ${
          solid
            ? 'py-3 sm:py-4 bg-charcoal/95 backdrop-blur-md border-b border-[var(--charcoal-line)] shadow-lg'
            : 'py-3.5 sm:py-6 bg-gradient-to-b from-[#15130F]/90 via-[#15130F]/50 to-transparent backdrop-blur-[2px]'
        }`}
        style={{ color: 'var(--ivory)' }}
      >
        {/* Logo — real image */}
        <Link href={`/${locale}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Image
            src="/logo.png"
            alt="RAWAQA"
            width={44}
            height={44}
            style={{ objectFit: 'contain', borderRadius: 10, filter: solid ? 'none' : 'brightness(1.1)' }}
            priority
          />
          <span style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: '1.1rem',
            letterSpacing: '.14em',
            fontWeight: 500,
            color: 'var(--ivory)',
          }}>
            RAWAQA
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: t('shop'), href: `/${locale}/shop` },
            { label: t('collections'), href: `/${locale}/shop` },
            { label: t('track'), href: `/${locale}/track` },
          ].map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className="text-[.8rem] tracking-wide text-ivory/80 hover:text-[var(--gold-light)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lang toggle */}
          <button
            onClick={switchLocale}
            className="hidden md:inline-flex items-center justify-center h-9 px-3 text-[.75rem] tracking-widest font-semibold text-ivory/80 border border-white/20 rounded-full hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
          >
            {otherLocale.toUpperCase()}
          </button>

          {/* Cart */}
          <Link
            href={`/${locale}/cart`}
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-ivory/90 hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
            aria-label="Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="translate-y-[-0.5px]">
              <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 text-[.6rem] font-bold bg-[var(--gold-light)] text-[#15130F] rounded-full flex items-center justify-center shadow-md leading-none">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Account */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center h-9 px-3 text-[.75rem] font-semibold text-[var(--gold-light)] border border-[var(--gold-light)]/30 rounded-full hover:bg-[var(--gold-light)]/10 transition-all"
                >
                  {t('admin')}
                </Link>
              )}
              <Link
                href={`/${locale}/account`}
                className="inline-flex items-center justify-center h-9 px-3 text-[.78rem] font-medium text-ivory/85 hover:text-[var(--gold-light)] hover:bg-white/5 rounded-full transition-all gap-1.5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center h-9 px-2.5 text-[.75rem] text-ivory/50 hover:text-ivory/90 hover:bg-white/5 rounded-full transition-all"
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="hidden md:inline-flex items-center justify-center h-9 px-4 text-[.78rem] font-semibold text-ivory/90 hover:text-[var(--gold-light)] border border-white/20 hover:border-[var(--gold-light)] rounded-full hover:bg-white/5 transition-all gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{t('login')}</span>
            </Link>
          )}

          {/* Burger */}
          <button
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-ivory hover:bg-white/5 transition-all"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[200] bg-charcoal flex flex-col" style={{ color: 'var(--ivory)' }}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--charcoal-line)]">
            <Link href={`/${locale}`} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Image src="/logo.png" alt="RAWAQA" width={36} height={36} style={{ objectFit: 'contain', borderRadius: 8 }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1rem', letterSpacing: '.14em', color: 'var(--ivory)' }}>RAWAQA</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} className="text-ivory/60 hover:text-ivory text-2xl">✕</button>
          </div>
          <nav className="flex flex-col gap-1 p-6">
            {[
              { label: t('shop'), href: `/${locale}/shop` },
              { label: t('track'), href: `/${locale}/track` },
              { label: t('cart'), href: `/${locale}/cart` },
              ...(isLoggedIn ? [{ label: t('account'), href: `/${locale}/account` }] : [{ label: t('login'), href: `/${locale}/login` }]),
              ...(isAdmin ? [{ label: t('admin'), href: '/admin' }] : []),
            ].map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-lg text-ivory/80 border-b border-[var(--charcoal-line)] hover:text-[var(--gold-light)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="py-3 text-left text-lg text-ivory/50 hover:text-ivory/80 transition-colors"
              >
                {t('logout')}
              </button>
            )}
          </nav>
          <div className="mt-auto p-6 border-t border-[var(--charcoal-line)]">
            <button
              onClick={() => { switchLocale(); setMenuOpen(false); }}
              className="text-[.78rem] tracking-widest text-ivory/60 border border-white/20 rounded-pill px-4 py-2"
            >
              {otherLocale === 'ar' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
