import '@testing-library/jest-dom';

// Suppress Next.js router warnings in test environment
vi.mock('next/navigation', () => ({
  useRouter:     () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useParams:     () => ({ locale: 'ar' }),
  useSearchParams: () => ({ get: () => null }),
  usePathname:   () => '/',
}));

// Mock next-intl — return the translation key so tests can assert on keys
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale:       () => 'ar',
}));

// Mock next/image — render a plain <img>
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    const { src, alt, fill, ...rest } = props;
    return <img src={src} alt={alt} {...rest} />;
  },
}));
