'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t      = useTranslations('footer');
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const isAr   = locale === 'ar';
  const year   = new Date().getFullYear();

  const shopLinks = [
    { label: t('all_products'), href: `/${locale}/shop` },
    { label: t('relax'),        href: `/${locale}/shop?category=relax` },
    { label: t('game'),         href: `/${locale}/shop?category=game` },
    { label: t('kids'),         href: `/${locale}/shop?category=kids` },
    { label: t('outdoor'),      href: `/${locale}/shop?category=outdoor` },
  ];

  const supportLinks = [
    { label: t('track_order'), href: `/${locale}/track` },
    { label: t('contact'),     href: '#' },
    { label: t('faq'),         href: '#' },
    { label: t('about'),       href: '#' },
  ];

  const legalLinks = [
    { label: t('privacy'), href: '#' },
    { label: t('terms'),   href: '#' },
  ];

  return (
    <footer style={{ background: 'var(--charcoal)', color: 'var(--ivory)' }}>
      {/* ── Top divider glow ── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--gold-light), transparent)',
        opacity: .25,
      }} />

      {/* ── Main footer body ── */}
      <div className="wrap" style={{ padding: '3.5rem 0 2.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}>

          {/* Brand column */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            {/* Logo mark */}
            <Link href={`/${locale}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
              <Image src="/logo.png" alt="RAWAQA" width={38} height={38} style={{ objectFit: 'contain', borderRadius: 9 }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1.05rem', letterSpacing: '.14em', color: 'var(--ivory)' }}>
                RAWAQA
              </span>
            </Link>

            <p style={{
              fontSize: '.875rem',
              lineHeight: 1.7,
              color: 'rgba(247,244,236,.45)',
              maxWidth: '30ch',
              marginBottom: '1rem',
            }}>
              {t('tagline')}
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              {[
                { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                { label: 'Facebook',  path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
              ].map(({ label, path }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '1px solid rgba(247,244,236,.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(247,244,236,.5)',
                    transition: 'all 300ms ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--gold-light)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold-light)';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(247,244,236,.15)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(247,244,236,.5)';
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Shop column */}
          <div>
            <p style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '1.25rem', fontWeight: 600 }}>
              {t('shop')}
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {shopLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.55)', transition: 'color 250ms ease' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.55)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support column */}
          <div>
            <p style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '1.25rem', fontWeight: 600 }}>
              {t('support')}
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {supportLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    style={{ fontSize: '.875rem', color: 'rgba(247,244,236,.55)', transition: 'color 250ms ease' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.55)')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <p style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(247,244,236,.35)', marginBottom: '1.25rem', fontWeight: 600 }}>
              {isAr ? 'تواصل معنا' : 'Contact'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[
                { icon: '📞', val: '+20 100 000 0000' },
                { icon: '✉️', val: 'hello@rawaqa.com' },
                { icon: '📍', val: isAr ? 'القاهرة، مصر' : 'Cairo, Egypt' },
              ].map(({ icon, val }) => (
                <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ fontSize: '.85rem' }}>{icon}</span>
                  <span style={{ fontSize: '.82rem', color: 'rgba(247,244,236,.5)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          paddingTop: '2rem',
          borderTop: '1px solid rgba(247,244,236,.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <p style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.28)' }}>
            © {year} RAWAQA. {t('rights')}.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {legalLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.3)', transition: 'color 250ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(247,244,236,.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(247,244,236,.3)')}
              >
                {label}
              </Link>
            ))}
          </div>

          <p style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.22)' }}>
            Made in Egypt 🇪🇬
          </p>
        </div>
      </div>
    </footer>
  );
}
