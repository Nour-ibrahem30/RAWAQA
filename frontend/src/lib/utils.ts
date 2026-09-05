// Fix clsx import — inline implementation
function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export { cn };

/** Pick localized string based on locale */
export function loc(ar: string | undefined, en: string | undefined, locale: string): string {
  if (locale === 'ar') return ar || en || '';
  return en || ar || '';
}

/** Format EGP price */
export function formatPrice(amount: number, locale: string): string {
  if (locale === 'ar') return `${amount.toLocaleString('ar-EG')} ج.م`;
  return `EGP ${amount.toLocaleString('en-EG')}`;
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
}
