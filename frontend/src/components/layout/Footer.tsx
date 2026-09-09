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
    <footer style={{ background: '#0e0c09', color: 'var(--ivory)' }}>
      {/* ── Top divider glow ── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--gold-light), transparent)',
        opacity: .3,
      }} />

      {/* ── Trust features strip ── */}
      <div className="border-b border-white/5 py-8" style={{ background: 'rgba(255,255,255,.015)' }}>
        <div className="wrap">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { icon: '🚚', titleAr: 'توصيل سريع', titleEn: 'Fast Delivery', subAr: 'لكل محافظات مصر', subEn: 'To all governorates' },
              { icon: '🔒', titleAr: 'دفع عند الاستلام', titleEn: 'Cash on Delivery', subAr: 'تسوق بأمان تام', subEn: '100% Secure Shopping' },
              { icon: '✨', titleAr: 'جودة متميزة', titleEn: 'Premium Quality', subAr: 'خامات تدوم طويلاً', subEn: 'Built to last' },
              { icon: '🇪🇬', titleAr: 'صناعة مصرية', titleEn: 'Made in Egypt', subAr: 'بأيدي أمهر الحرفيين', subEn: 'Handcrafted with pride' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(210,181,106,.08)', border: '1px solid rgba(210,181,106,.15)' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-ivory/90">{isAr ? f.titleAr : f.titleEn}</p>
                  <p className="text-[.7rem] sm:text-xs text-ivory/40 mt-0.5">{isAr ? f.subAr : f.subEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main footer body ── */}
      <div className="wrap py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-5 min-w-0">
            {/* Logo mark */}
            <Link href={`/${locale}`} className="inline-flex items-center gap-2.5 mb-4">
              <Image src="/logo.png" alt="RAWAQA" width={40} height={40} style={{ objectFit: 'contain', borderRadius: 10 }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1.2rem', letterSpacing: '.14em', color: 'var(--ivory)' }}>
                RAWAQA
              </span>
            </Link>

            <p style={{
              fontSize: '.9rem',
              lineHeight: 1.75,
              color: 'rgba(247,244,236,.5)',
              maxWidth: '38ch',
              marginBottom: '1.5rem',
            }}>
              {t('tagline')}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                { label: 'Facebook',  path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
              ].map(({ label, path }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ivory/50 border border-white/15 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] hover:bg-[var(--gold-light)]/10 hover:-translate-y-0.5 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Shop column */}
          <div className="lg:col-span-2">
            <p className="text-[.68rem] tracking-widest uppercase font-bold text-[var(--gold-light)] mb-4">
              {t('shop')}
            </p>
            <ul className="flex flex-col gap-2.5">
              {shopLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-ivory/60 hover:text-[var(--gold-light)] hover:ps-1 transition-all inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support column */}
          <div className="lg:col-span-2">
            <p className="text-[.68rem] tracking-widest uppercase font-bold text-[var(--gold-light)] mb-4">
              {t('support')}
            </p>
            <ul className="flex flex-col gap-2.5">
              {supportLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-ivory/60 hover:text-[var(--gold-light)] hover:ps-1 transition-all inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div className="lg:col-span-3">
            <p className="text-[.68rem] tracking-widest uppercase font-bold text-[var(--gold-light)] mb-4">
              {isAr ? 'تواصل وخدمة العملاء' : 'Contact & Support'}
            </p>
            <div className="flex flex-col gap-3">
              {[
                { icon: '📞', val: '+20 100 000 0000', label: isAr ? 'هاتفياً' : 'Phone' },
                { icon: '✉️', val: 'hello@rawaqa.com', label: isAr ? 'البريد' : 'Email' },
                { icon: '📍', val: isAr ? 'القاهرة، جمهورية مصر العربية' : 'Cairo, Egypt', label: isAr ? 'الموقع' : 'Location' },
              ].map(({ icon, val }) => (
                <div key={val} className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs sm:text-sm text-ivory/60">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ivory/40 text-center sm:text-start">
            © {year} RAWAQA. {t('rights')}.
          </p>

          <div className="flex items-center gap-6">
            {legalLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs text-ivory/40 hover:text-ivory/80 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="text-xs text-[var(--gold-light)]/70 font-semibold tracking-wide flex items-center gap-1.5">
            <span>Made with pride in Egypt</span>
            <span>🇪🇬</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
