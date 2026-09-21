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
  const t       = useTranslations('nav');
  const params  = useParams();
  const pathname = usePathname() || '';
  const router  = useRouter();
  const locale      = (params?.locale as string) || 'ar';
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const isAr        = locale === 'ar';

  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  const [solid, setSolid]       = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    categoriesApi.list(locale).then(r => {
      if (!cancelled && Array.isArray(r.data)) setCategories(r.data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    // Close if window resizes to desktop
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    closeBtnRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const switchLocale = () => {
    const path = pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;
    const qs   = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`${path}${qs}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}`);
    setMenuOpen(false);
  };

  const shopHref    = `/${locale}/shop`;
  const cartHref    = `/${locale}/cart`;
  const accountHref = `/${locale}/account`;

  const isShopActive    = pathname.includes('/shop');
  const isCartActive    = pathname.includes('/cart');
  const isAccountActive = pathname.includes('/account');

  // Active link style helper
  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontSize:      '.78rem',
    letterSpacing: '.04em',
    fontWeight:    active ? 600 : 400,
    color:         active ? 'var(--gold-light)' : 'rgba(247,244,236,.72)',
    transition:    'color 180ms ease',
    position:      'relative',
    padding:       '.2rem 0',
  });

  return (
    <>
      {/* ─── Desktop Navbar ──────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: solid
            ? 'rgba(15,14,10,.92)'
            : 'linear-gradient(to bottom, rgba(15,14,10,.85) 0%, rgba(15,14,10,.4) 70%, transparent 100%)',
          backdropFilter: solid ? 'blur(20px) saturate(1.4)' : 'blur(6px)',
          WebkitBackdropFilter: solid ? 'blur(20px) saturate(1.4)' : 'blur(6px)',
          borderBottom: solid ? '1px solid rgba(210,181,106,.1)' : 'none',
          boxShadow:    solid ? '0 4px 24px rgba(0,0,0,.3)' : 'none',
          padding:      solid ? '.75rem 0' : '1rem 0',
          color: 'var(--ivory)',
        }}
      >
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 5vw, 3rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>

          {/* ── Brand / Logo ─────────────────────────────────────────── */}
          <Link
            href={`/${locale}`}
            aria-label={t('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '.625rem', flexShrink: 0, textDecoration: 'none' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 2px 12px rgba(210,181,106,.2)',
              border: '1px solid rgba(210,181,106,.15)',
            }}>
              <Image src="/logo.png" alt="" aria-hidden width={40} height={40}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }} priority />
            </div>
            <span style={{
              fontFamily:    'var(--font-fraunces, serif)',
              fontSize:      '1.05rem',
              letterSpacing: '.18em',
              fontWeight:    600,
              color:         'var(--ivory)',
            }}>
              RAWAQA
            </span>
          </Link>

          {/* ── Center nav links (desktop) ───────────────────────────── */}
          <div className="hidden md:flex items-center" style={{ gap: '2rem' }}>
            {[
              { href: shopHref,            label: t('shop'),  active: isShopActive },
              { href: `/${locale}/track`,  label: t('track'), active: pathname.includes('/track') },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={linkStyle(link.active)}
                aria-current={link.active ? 'page' : undefined}
                className="nav-link-anim"
                onMouseEnter={e => { if (!link.active) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ivory)'; }}
                onMouseLeave={e => { if (!link.active) (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(247,244,236,.72)'; }}
              >
                {link.label}
                {link.active && (
                  <span style={{
                    position: 'absolute', bottom: -2, left: 0, right: 0,
                    height: 1.5, borderRadius: 999,
                    background: 'var(--gold-light)',
                    boxShadow: '0 0 6px rgba(210,181,106,.5)',
                  }} />
                )}
              </Link>
            ))}
          </div>

          {/* ── Right side actions ───────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem', flexShrink: 0 }}>

            {/* Language switcher — subtle, text-only on desktop */}
            <button
              type="button"
              onClick={switchLocale}
              className="hidden md:inline-flex"
              style={{
                alignItems: 'center', justifyContent: 'center',
                height: 36, padding: '0 .75rem',
                fontSize: '.65rem', fontWeight: 700, letterSpacing: '.12em',
                color: 'rgba(247,244,236,.45)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 180ms',
                borderRadius: 999,
              }}
              aria-label={t('switch_language', { lang: otherLocale === 'ar' ? 'العربية' : 'English' })}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(247,244,236,.85)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.45)')}
            >
              {otherLocale.toUpperCase()}
            </button>

            {/* Divider */}
            <div className="hidden md:block" style={{
              width: 1, height: 18,
              background: 'rgba(247,244,236,.1)',
              margin: '0 .25rem',
            }} />

            {/* Wishlist */}
            <Link
              href={`/${locale}/wishlist`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10,
                color: 'rgba(247,244,236,.7)',
                transition: 'all 180ms ease',
                background: 'none',
              }}
              aria-label={t('wishlist')}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold-light)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(210,181,106,.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(247,244,236,.7)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'none';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>

            {/* Cart */}
            <Link
              href={cartHref}
              style={{
                position: 'relative',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10,
                color: isCartActive ? 'var(--gold-light)' : 'rgba(247,244,236,.7)',
                background: isCartActive ? 'rgba(210,181,106,.08)' : 'none',
                transition: 'all 180ms ease',
              }}
              aria-label={t('cart')}
              aria-current={isCartActive ? 'page' : undefined}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold-light)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(210,181,106,.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = isCartActive ? 'var(--gold-light)' : 'rgba(247,244,236,.7)';
                (e.currentTarget as HTMLAnchorElement).style.background = isCartActive ? 'rgba(210,181,106,.08)' : 'none';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 8V6a3 3 0 016 0v2"  stroke="currentColor" strokeWidth="1.6" />
              </svg>
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  insetInlineEnd: '3px',
                  minWidth: 16, height: 16,
                  padding: '0 4px',
                  fontSize: '.55rem', fontWeight: 800, lineHeight: '16px',
                  background: 'var(--gold-light)', color: 'var(--charcoal)',
                  borderRadius: 999, textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,.4)',
                }}>
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Auth section */}
            {isLoggedIn ? (
              <div className="hidden md:flex items-center" style={{ gap: '.25rem', marginInlineStart: '.25rem' }}>

                {/* Admin pill */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      height: 34, padding: '0 .875rem',
                      fontSize: '.7rem', fontWeight: 700, letterSpacing: '.06em',
                      color: 'var(--gold-light)',
                      background: 'rgba(210,181,106,.08)',
                      border: '1px solid rgba(210,181,106,.22)',
                      borderRadius: 999,
                      transition: 'all 180ms ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(210,181,106,.15)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(210,181,106,.4)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(210,181,106,.08)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(210,181,106,.22)';
                    }}
                  >
                    {t('admin')}
                  </Link>
                )}

                {/* User avatar / name */}
                <Link
                  href={accountHref}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                    height: 34, padding: '0 .625rem',
                    fontSize: '.75rem', fontWeight: 500,
                    color: isAccountActive ? 'var(--gold-light)' : 'rgba(247,244,236,.75)',
                    background: isAccountActive ? 'rgba(210,181,106,.06)' : 'none',
                    borderRadius: 999,
                    transition: 'all 180ms ease',
                    textDecoration: 'none',
                  }}
                  aria-current={isAccountActive ? 'page' : undefined}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ivory)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = isAccountActive ? 'var(--gold-light)' : 'rgba(247,244,236,.75)'; }}
                >
                  {/* Avatar circle */}
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--gold-light), #a07840)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.6rem', fontWeight: 800, color: 'var(--charcoal)',
                  }}>
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="hidden lg:inline">{user?.name?.split(' ')[0]}</span>
                </Link>

                {/* Logout — icon only */}
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(247,244,236,.35)',
                    transition: 'all 180ms',
                  }}
                  aria-label={t('logout')}
                  title={t('logout')}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,.07)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(247,244,236,.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="hidden md:inline-flex"
                style={{
                  alignItems: 'center', justifyContent: 'center',
                  height: 34, padding: '0 1rem', marginInlineStart: '.25rem',
                  fontSize: '.72rem', fontWeight: 600, letterSpacing: '.04em',
                  color: 'var(--ivory)',
                  background: 'rgba(255,255,255,.07)',
                  border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: 999,
                  transition: 'all 180ms ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,.12)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.22)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,.07)';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.12)';
                }}
              >
                {t('login')}
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden"
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(247,244,236,.85)',
                marginInlineStart: '.25rem',
              }}
              onClick={() => { if (window.innerWidth < 768) setMenuOpen(true); }}
              aria-label={t('menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-dialog"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Mobile menu — hidden on md+ ────────────────────────────── */}
      {menuOpen && (
        <div
          id="mobile-nav-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
          className="md:hidden"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'var(--charcoal)', color: 'var(--ivory)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Mobile header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid rgba(210,181,106,.1)',
          }}>
            <Link
              href={`/${locale}`}
              onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '.5rem', textDecoration: 'none' }}
              aria-label={t('home')}
            >
              <Image src="/logo.png" alt="" aria-hidden width={34} height={34}
                style={{ objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(210,181,106,.15)' }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '.95rem', letterSpacing: '.16em', color: 'var(--ivory)' }}>
                RAWAQA
              </span>
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.05)',
                border: 'none', cursor: 'pointer', color: 'rgba(247,244,236,.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}
              aria-label={t('close_menu')}
            >
              ✕
            </button>
          </div>

          {/* Mobile links */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            {[
              { label: t('shop'),   href: shopHref,                          active: isShopActive },
              { label: t('track'),  href: `/${locale}/track`,                active: pathname.includes('/track') },
              { label: t('wishlist'), href: `/${locale}/wishlist`,           active: pathname.includes('/wishlist') },
              { label: t('cart'),   href: cartHref,                          active: isCartActive },
              ...(isLoggedIn
                ? [{ label: t('account'), href: accountHref, active: isAccountActive }]
                : [{ label: t('login'), href: `/${locale}/login`, active: pathname.includes('/login') }]),
              ...(isAdmin ? [{ label: t('admin'), href: '/admin', active: false }] : []),
            ].map(l => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                aria-current={l.active ? 'page' : undefined}
                style={{
                  display: 'block', padding: '.875rem 0',
                  fontSize: '1.05rem', fontWeight: l.active ? 600 : 400,
                  color: l.active ? 'var(--gold-light)' : 'rgba(247,244,236,.8)',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  textDecoration: 'none',
                }}
              >
                {l.label}
              </Link>
            ))}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'block', padding: '.875rem 0', width: '100%',
                  textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '1.05rem', color: 'rgba(247,244,236,.4)',
                }}
              >
                {t('logout')}
              </button>
            )}
          </nav>

          {/* Mobile footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(210,181,106,.1)',
          }}>
            <button
              type="button"
              onClick={() => { switchLocale(); setMenuOpen(false); }}
              style={{
                padding: '.5rem 1.25rem', borderRadius: 999,
                fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                color: 'rgba(247,244,236,.55)',
                cursor: 'pointer',
              }}
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
