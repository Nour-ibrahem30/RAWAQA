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

  const socialChannels = [
    {
      name: isAr ? 'فيسبوك' : 'Facebook',
      href: 'https://facebook.com',
      ariaLabel: 'Facebook',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: isAr ? 'إنستغرام' : 'Instagram',
      href: 'https://instagram.com',
      ariaLabel: 'Instagram',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      name: isAr ? 'واتساب' : 'WhatsApp',
      href: 'https://wa.me/201000000000',
      ariaLabel: 'WhatsApp',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
    },
  ];

  return (
    <footer style={{ background: '#0a0907', color: 'var(--ivory)' }}>
      {/* ── Top subtle gold divider line ── */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.3), transparent)',
      }} />

      {/* ── Main footer body ── */}
      <div className="wrap py-14 sm:py-16 md:py-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 text-center md:text-start pb-10 md:pb-12 border-b border-white/5">

          {/* Brand Info */}
          <div className="flex flex-col items-center md:items-start max-w-sm">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="RAWAQA" width={38} height={38} style={{ objectFit: 'contain', borderRadius: 8 }} />
              <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1.25rem', letterSpacing: '.14em', color: 'var(--ivory)', fontWeight: 600 }}>
                RAWAQA
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-ivory/60 leading-relaxed">
              {isAr
                ? 'العلامة المصرية الرائدة في صناعة كراسي البين باج الفاخرة للراحة والأناقة.'
                : 'Leading Egyptian brand crafting luxury bean bag chairs for comfort and elegance.'}
            </p>
          </div>

          {/* Social Channels: Facebook, Instagram, WhatsApp */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            {socialChannels.map(({ name, href, ariaLabel, icon }) => (
              <a
                key={ariaLabel}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={ariaLabel}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-[var(--gold-light)]/10 hover:border-[var(--gold-light)]/40 hover:text-[var(--gold-light)] text-ivory/80 transition-all text-xs font-semibold shadow-sm hover:shadow-md"
              >
                <span>{icon}</span>
                <span>{name}</span>
              </a>
            ))}
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ivory/45">
          <p className="text-center sm:text-start">
            © {year} RAWAQA. {t('rights')}.
          </p>

          <p className="text-[var(--gold-light)]/80 font-medium tracking-wider text-[.78rem] flex items-center gap-1.5">
            <span>Made in Egypt</span>
            <span>🇪🇬</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
