/* ============ API RESPONSE SHAPE ============ */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/* ============ LOCALIZED STRING ============ */
export interface LocalizedString {
  ar: string;
  en: string;
}

/* ============ USER ============ */
export interface User {
  id: string;
  name: string;          // computed from firstName + lastName
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'super_admin';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/* ============ CATEGORY ============ */
export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  slug: string;
  image?: string;
  productCount?: number;
  status: 'active' | 'inactive';
}

/* ============ PRODUCT ============ */
export interface ProductInventory {
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr?: string;
  longDescriptionEn?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: Pick<Category, 'id' | 'nameAr' | 'nameEn' | 'slug'>;
  inventory: ProductInventory;
  featured: boolean;
  status: 'active' | 'inactive' | 'archived';
  tags?: string[];
  createdAt: string;
}

/* ============ CART ============ */
export interface CartItem {
  product: Pick<Product, 'id' | 'nameAr' | 'nameEn' | 'price' | 'images' | 'sku'>;
  quantity: number;
  price: number;
  total: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

/* ============ ORDER ============ */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  streetAddress: string;
  city: string;
  governorate: string;
  postalCode?: string;
  notes?: string;
}

export interface OrderItem {
  product: { id: string; nameAr: string; nameEn: string; sku: string };
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  odooSyncStatus?: string;
  smsStatus?: string;
  couponCode?: string;
  couponDiscount?: number;
  createdAt: string;
  updatedAt: string;
}

/* ============ CHECKOUT ============ */
export interface CheckoutPayload {
  cartId: string;
  shippingAddress: ShippingAddress;
  paymentMethod: 'cash_on_delivery';
  couponCode?: string;
  notes?: string;
}

/* ============ COUPONS ============ */
export interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CouponApplyResult {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discountAmount: number;
  finalTotal: number;
}

/* ============ ADMIN ============ */
export interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: Order[];
}

/* ============ SITE SETTINGS ============ */
export interface SiteColors {
  charcoal: string;
  charcoalSoft: string;
  ivory: string;
  ivory2: string;
  sand: string;
  gold: string;
  goldLight: string;
  goldPale: string;
  ink: string;
  inkSoft: string;
  clay: string;
  indigo: string;
  ochre: string;
  forest: string;
  dune: string;
}

export const DEFAULT_COLORS: SiteColors = {
  charcoal: '#15130F',
  charcoalSoft: '#1E1B15',
  ivory: '#F7F4EC',
  ivory2: '#FDFCF9',
  sand: '#E8E0D2',
  gold: '#AD8A4C',
  goldLight: '#D2B56A',
  goldPale: '#E7D8B4',
  ink: '#262117',
  inkSoft: '#6E6656',
  clay: '#A8543A',
  indigo: '#3B5578',
  ochre: '#BE8F2E',
  forest: '#4B5B45',
  dune: '#C9A876',
};

export interface ThemePreset {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  colors: SiteColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'luxury-gold',
    name: 'Classic Royal Amber & Gold (Default)',
    nameAr: 'الفخامة الملكية بالعنبر والذهب (الافتراضي)',
    description: 'Deep espresso charcoal paired with radiant warm gold and soft silk ivory.',
    colors: { ...DEFAULT_COLORS },
  },
  {
    id: 'emerald-velvet',
    name: 'Imperial Emerald & Warm Brass',
    nameAr: 'الزمرد الإمبراطوري والنحاس الدافئ',
    description: 'Deep royal emerald velvet, satin forest hues with warm luminous brass accents.',
    colors: {
      charcoal: '#0B1712',
      charcoalSoft: '#13231C',
      ivory: '#F4F7F4',
      ivory2: '#FAFDFB',
      sand: '#D5DFD7',
      gold: '#C5A059',
      goldLight: '#E0BC75',
      goldPale: '#F5E7CA',
      ink: '#0E1C15',
      inkSoft: '#4D6256',
      clay: '#9E5841',
      indigo: '#243C5A',
      ochre: '#C8933A',
      forest: '#1E472E',
      dune: '#B8A382',
    },
  },
  {
    id: 'royal-midnight',
    name: 'Sapphire Midnight & Champagne',
    nameAr: 'الياقوت الليلي وشامبين الذهب',
    description: 'Rich deep navy midnight tone illuminated by sparkling champagne gold.',
    colors: {
      charcoal: '#0A111E',
      charcoalSoft: '#121C2F',
      ivory: '#F3F6FA',
      ivory2: '#FAFBFD',
      sand: '#D2DEED',
      gold: '#D4AF37',
      goldLight: '#ECD06F',
      goldPale: '#F8ECC4',
      ink: '#0C1524',
      inkSoft: '#50637F',
      clay: '#B55B42',
      indigo: '#3B5998',
      ochre: '#CA9438',
      forest: '#2A5741',
      dune: '#B7A283',
    },
  },
  {
    id: 'desert-terracotta',
    name: 'Tuscan Terracotta & Warm Sand',
    nameAr: 'التيراكوتا التوسكانية والرمال الذهبية',
    description: 'Earthy warm Tuscan clay, rich caramel leather tones, and soft desert sun.',
    colors: {
      charcoal: '#1A120E',
      charcoalSoft: '#271B15',
      ivory: '#FAF6F1',
      ivory2: '#FCFAF7',
      sand: '#EADBCC',
      gold: '#C87444',
      goldLight: '#E28E5E',
      goldPale: '#F8DCBE',
      ink: '#26160F',
      inkSoft: '#6F5447',
      clay: '#B84C32',
      indigo: '#3A526E',
      ochre: '#C98528',
      forest: '#425640',
      dune: '#C59C72',
    },
  },
  {
    id: 'minimalist-monochrome',
    name: 'Obsidian Noir & Titanium Silver',
    nameAr: 'الأوبسيديان الأسود والفضة البلاتينية',
    description: 'Sleek dark obsidian stone paired with pure crisp white and lustrous platinum.',
    colors: {
      charcoal: '#0F1012',
      charcoalSoft: '#181A1D',
      ivory: '#F7F8FA',
      ivory2: '#FFFFFF',
      sand: '#E1E3E8',
      gold: '#9CA3AF',
      goldLight: '#CBD5E1',
      goldPale: '#F1F5F9',
      ink: '#111827',
      inkSoft: '#64748B',
      clay: '#7F1D1D',
      indigo: '#334155',
      ochre: '#92400E',
      forest: '#14532D',
      dune: '#94A3B8',
    },
  },
  {
    id: 'imperial-plum',
    name: 'Bordeaux Plum & Rose Gold',
    nameAr: 'العقيق البورجندي والذهب الوردي',
    description: 'Velvety deep wine plum accented with warm blush rose-gold tones.',
    colors: {
      charcoal: '#150A16',
      charcoalSoft: '#221224',
      ivory: '#FAF4F9',
      ivory2: '#FCF8FB',
      sand: '#EADCE8',
      gold: '#D9799B',
      goldLight: '#F099BA',
      goldPale: '#FCE1ED',
      ink: '#200B21',
      inkSoft: '#6A4A6C',
      clay: '#9E3A59',
      indigo: '#4C2860',
      ochre: '#C07C45',
      forest: '#3A423B',
      dune: '#BA92A8',
    },
  },
];

