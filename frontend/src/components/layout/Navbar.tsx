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
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-[6vw] transition-all duration-300 ${
          solid
            ? 'py-4 bg-charcoal/90 backdrop-blur-md border-b border-[var(--charcoal-line)]'
            : 'py-6'
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
        <div className="flex items-center gap-5">
          {/* Lang toggle */}
          <button
            onClick={switchLocale}
            className="hidden md:flex text-[.72rem] tracking-widest text-ivory/75 border border-white/25 rounded-pill px-3 py-1.5 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] transition-colors"
          >
            {otherLocale.toUpperCase()}
          </button>

          {/* Cart */}
          <Link href={`/${locale}/cart`} className="relative text-ivory/90 hover:text-[var(--gold-light)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 text-[.6rem] font-black bg-[var(--gold-light)] text-charcoal rounded-full flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Account */}
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-4">
              {isAdmin && (
                <Link href="/admin" className="text-[.78rem] text-[var(--gold-light)] hover:underline">
                  {t('admin')}
                </Link>
              )}
              <Link href={`/${locale}/account`} className="text-[.78rem] text-ivory/80 hover:text-[var(--gold-light)] transition-colors">
                {user?.name?.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="text-[.78rem] text-ivory/50 hover:text-ivory/80 transition-colors">
                {t('logout')}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="hidden md:flex text-[.78rem] text-ivory/80 hover:text-[var(--gold-light)] transition-colors"
            >
              {t('login')}
            </Link>
          )}

          {/* Burger */}
          <button
            className="md:hidden text-ivory"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
