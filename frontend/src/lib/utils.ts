// Fix clsx import — inline implementation
function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export { cn };

/** Shop filter value from a live category document. Never invents slugs. */
export function categoryFilterParam(cat: {
  slug?: string;
  slugEn?: string;
  slugAr?: string;
  id?: string;
  _id?: string;
} | null | undefined): string | null {
  if (!cat) return null;
  const slug = cat.slug || cat.slugEn || cat.slugAr;
  if (typeof slug === 'string' && slug.trim()) return slug.trim();
  const id = cat.id || cat._id;
  if (id) return String(id);
  return null;
}

/** Pick localized string based on locale */
export function loc(ar: string | undefined, en: string | undefined, locale: string): string {
  if (locale === 'ar') return ar || en || '';
  return en || ar || '';
}

/** Format EGP price */
export function formatPrice(amount: number | undefined | null, locale: string): string {
  const n = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (locale === 'ar') return `${formatted} ج.م`;
  return `EGP ${formatted}`;
}

/** Egyptian phone E.164 normalization */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('20')) return `+${digits}`;
  if (digits.startsWith('0')) return `+2${digits}`;
  return `+20${digits}`;
}

/** Generate idempotency key */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Order status label */
export function orderStatusLabel(status: string, locale: string): string {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: 'في الانتظار', en: 'Pending' },
    confirmed: { ar: 'مؤكد', en: 'Confirmed' },
    preparing: { ar: 'جاري التحضير', en: 'Preparing' },
    shipped: { ar: 'تم الشحن', en: 'Shipped' },
    delivered: { ar: 'تم التوصيل', en: 'Delivered' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };
  return loc(labels[status]?.ar, labels[status]?.en, locale) || status;
}

/** Order status color */
export function orderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/** Apply brand CSS variables to :root */
export function applyColors(colors: Record<string, string>) {
  const map: Record<string, string> = {
    charcoal: '--charcoal',
    charcoalSoft: '--charcoal-soft',
    ivory: '--ivory',
    ivory2: '--ivory-2',
    sand: '--sand',
    gold: '--gold',
    goldLight: '--gold-light',
    goldPale: '--gold-pale',
    ink: '--ink',
    inkSoft: '--ink-soft',
    clay: '--clay',
    indigo: '--indigo',
    ochre: '--ochre',
    forest: '--forest',
    dune: '--dune',
  };
  Object.entries(colors).forEach(([key, val]) => {
    if (map[key]) document.documentElement.style.setProperty(map[key], val);
  });
  if (colors.goldLight || colors.gold) {
    document.documentElement.style.setProperty(
      '--charcoal-line',
      'color-mix(in srgb, var(--gold-light) 18%, transparent)'
    );
  }

  // Set data-theme attribute so CSS [data-theme="light"] overrides fire.
  // A "light" theme is detected when --charcoal resolves to a clearly light color
  // (luminance > 50% — quick heuristic: first char after # is 'f', 'e', 'd', 'c', 'b', 'a' or ≥ 8).
  if (colors.charcoal) {
    const hex = colors.charcoal.replace('#', '').toLowerCase();
    const r = parseInt(hex.slice(0, 2), 16);
    const isLight = r >= 180; // r channel of charcoal ≥ 180 = light background
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  }
}

/** Resolves any image URL safely (handles localhost, /uploads, Cloudinary, fallback) */
export function resolveProductImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '/products/cloud-lounger.jpg';
  }
  const clean = url.trim();
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');

  if (clean.includes('localhost:5002') || clean.includes('127.0.0.1:5002')) {
    return clean.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):5002/, apiOrigin);
  }
  if (clean.startsWith('/uploads')) {
    return `${apiOrigin}${clean}`;
  }
  return clean;
}
