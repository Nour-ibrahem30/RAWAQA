'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { categoriesApi } from '@/lib/api';
import { categoryFilterParam, loc } from '@/lib/utils';
import type { Category } from '@/lib/types';

export default function Navbar() {
  const t = useTranslations('nav');
  const params = useParams();
  const pathname = usePathname() || '';
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const otherLocale = locale === 'ar' ? 'en' : 'ar';

  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const catsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    categoriesApi.list(locale)
      .then((r) => {
        if (!cancelled && Array.isArray(r.data)) setCategories(r.data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!catsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatsOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) {
        setCatsOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [catsOpen]);

  const switchLocale = () => {
    const path = pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`${path}${qs}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}`);
    setMenuOpen(false);
  };

  const shopHref = `/${locale}/shop`;
  const cartHref = `/${locale}/cart`;
  const accountHref = `/${locale}/account`;
  const collectionsHref = `/${locale}#collections`;

  const isShopActive = pathname.includes('/shop');
  const isCartActive = pathname.includes('/cart');
  const isAccountActive = pathname.includes('/account');

  const navLinkClass = (active: boolean) =>
    `nav-link-anim text-[.8rem] tracking-wide transition-colors ${
      active ? 'text-[var(--gold-light)]' : 'text-ivory/80 hover:text-[var(--gold-light)]'
    }`;

  const categoryLinks = categories
    .map((cat) => {
      const filter = categoryFilterParam(cat);
      if (!filter) return null;
      return {
        href: `${shopHref}?category=${encodeURIComponent(filter)}`,
        label: loc(cat.nameAr, cat.nameEn, locale),
        key: cat.id || filter,
      };
    })
    .filter((x): x is { href: string; label: string; key: string } => Boolean(x));

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-[6vw] transition-all duration-300 ${
          solid
            ? 'py-3 sm:py-4 backdrop-blur-md border-b border-[var(--charcoal-line)] shadow-lg'
            : 'py-3.5 sm:py-6 backdrop-blur-[2px]'
        }`}
        style={{
          color: 'var(--ivory)',
          background: solid
            ? 'color-mix(in srgb, var(--charcoal) 95%, transparent)'
            : 'linear-gradient(to bottom, color-mix(in srgb, var(--charcoal) 90%, transparent) 0%, color-mix(in srgb, var(--charcoal) 40%, transparent) 65%, transparent 100%)',
        }}
      >
        <Link
          href={`/${locale}`}
          aria-label={t('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}
        >
          <Image
            src="/logo.png"
            alt=""
            aria-hidden="true"
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

        <div className="hidden md:flex items-center gap-8">
          <Link
            href={shopHref}
            className={navLinkClass(isShopActive)}
            aria-current={isShopActive ? 'page' : undefined}
          >
            {t('shop')}
          </Link>

          <div className="relative" ref={catsRef}>
            <button
              type="button"
              className={navLinkClass(false)}
              aria-expanded={catsOpen}
              aria-haspopup="true"
              aria-controls="nav-categories-menu"
              onClick={() => setCatsOpen((v) => !v)}
            >
              {t('collections')}
            </button>
            {catsOpen && (
              <ul
                id="nav-categories-menu"
                role="menu"
                className="absolute top-full mt-3 min-w-[12rem] rounded-xl py-2 z-50"
                style={{
                  insetInlineStart: 0,
                  background: 'var(--charcoal-soft)',
                  border: '1px solid var(--charcoal-line)',
                  boxShadow: '0 16px 40px rgba(0,0,0,.4)',
                }}
              >
                <li role="none">
                  <Link
                    role="menuitem"
                    href={collectionsHref}
                    onClick={() => setCatsOpen(false)}
                    className="block px-4 py-2.5 text-[.8rem] text-ivory/85 hover:text-[var(--gold-light)] hover:bg-white/5"
                  >
                    {t('collections')}
                  </Link>
                </li>
                {categoryLinks.map((c) => (
                  <li key={c.key} role="none">
                    <Link
                      role="menuitem"
                      href={c.href}
                      onClick={() => setCatsOpen(false)}
                      className="block px-4 py-2.5 text-[.8rem] text-ivory/85 hover:text-[var(--gold-light)] hover:bg-white/5"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link href={`/${locale}/track`} className={navLinkClass(pathname.includes('/track'))}>
            {t('track')}
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={switchLocale}
            className="hidden md:inline-flex items-center justify-center h-11 px-3 text-[.75rem] tracking-widest font-semibold text-ivory/80 border border-white/20 rounded-full hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
            aria-label={t('switch_language', { lang: otherLocale === 'ar' ? 'العربية' : 'English' })}
          >
            {otherLocale.toUpperCase()}
          </button>

          <Link
            href={`/${locale}/wishlist`}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-full text-ivory/90 hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
            aria-label={t('wishlist')}
            title={t('wishlist')}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>

          <Link
            href={cartHref}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-full text-ivory/90 hover:text-[var(--gold-light)] hover:bg-white/5 transition-all"
            aria-label={t('cart')}
            aria-current={isCartActive ? 'page' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="translate-y-[-0.5px]" aria-hidden>
              <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute top-1.5 min-w-[17px] h-[17px] px-1 text-[.6rem] font-bold bg-[var(--gold-light)] text-[var(--charcoal)] rounded-full flex items-center justify-center shadow-md leading-none"
                style={{ insetInlineEnd: '0.375rem' }}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center h-11 px-3 text-[.75rem] font-semibold text-[var(--gold-light)] border border-[var(--gold-light)]/30 rounded-full hover:bg-[var(--gold-light)]/10 transition-all"
                >
                  {t('admin')}
                </Link>
              )}
              <Link
                href={accountHref}
                className="inline-flex items-center justify-center h-11 px-3 text-[.78rem] font-medium rounded-full transition-all gap-1.5 hover:bg-white/5"
                aria-current={isAccountActive ? 'page' : undefined}
                style={{ color: isAccountActive ? 'var(--gold-light)' : 'rgba(247,244,236,.85)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center h-11 px-3 text-[.78rem] font-medium text-ivory/60 hover:text-ivory hover:bg-white/5 rounded-full transition-all"
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="hidden md:inline-flex items-center justify-center h-11 px-4 text-[.78rem] font-medium text-ivory/90 hover:text-ivory bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
            >
              {t('login')}
            </Link>
          )}

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-ivory hover:bg-white/5 transition-all"
            onClick={() => setMenuOpen(true)}
            aria-label={t('menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-dialog"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-nav-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: 'var(--charcoal)', color: 'var(--ivory)' }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--charcoal-line)]">
            <Link
              href={`/${locale}`}
              onClick={() => setMenuOpen(false)}
              aria-label={t('home')}
              style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}
            >
              <Image src="/logo.png" alt="" aria-hidden="true" width={36} height={36} style={{ objectFit: 'contain', borderRadius: 8 }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1rem', letterSpacing: '.14em', color: 'var(--ivory)' }}>RAWAQA</span>
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              className="touch-target inline-flex items-center justify-center w-11 h-11 text-ivory/60 hover:text-ivory text-2xl"
              aria-label={t('close_menu')}
            >
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-6">
            {[
              { label: t('shop'), href: shopHref, active: isShopActive },
              { label: t('collections'), href: collectionsHref, active: false },
              ...categoryLinks.map((c) => ({ label: c.label, href: c.href, active: false })),
              { label: t('wishlist'), href: `/${locale}/wishlist`, active: pathname.includes('/wishlist') },
              { label: t('track'), href: `/${locale}/track`, active: pathname.includes('/track') },
              { label: t('cart'), href: cartHref, active: isCartActive },
              ...(isLoggedIn
                ? [{ label: t('account'), href: accountHref, active: isAccountActive }]
                : [{ label: t('login'), href: `/${locale}/login`, active: pathname.includes('/login') }]),
              ...(isAdmin ? [{ label: t('admin'), href: '/admin', active: false }] : []),
            ].map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                aria-current={l.active ? 'page' : undefined}
                className="py-3 text-lg border-b border-[var(--charcoal-line)] hover:text-[var(--gold-light)] transition-colors"
                style={{ color: l.active ? 'var(--gold-light)' : 'rgba(247,244,236,.8)' }}
              >
                {l.label}
              </Link>
            ))}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 text-start text-lg text-ivory/50 hover:text-ivory/80 transition-colors"
              >
                {t('logout')}
              </button>
            )}
          </nav>
          <div className="mt-auto p-6 border-t border-[var(--charcoal-line)]">
            <button
              type="button"
              onClick={() => { switchLocale(); setMenuOpen(false); }}
              className="text-[.78rem] tracking-widest text-ivory/60 border border-white/20 rounded-pill px-4 py-2 min-h-11"
              aria-label={t('switch_language', { lang: otherLocale === 'ar' ? 'العربية' : 'English' })}
            >
              {otherLocale === 'ar' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
