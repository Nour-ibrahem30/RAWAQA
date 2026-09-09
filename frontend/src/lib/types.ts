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
  createdAt: string;
  updatedAt: string;
}

/* ============ CHECKOUT ============ */
export interface CheckoutPayload {
  cartId: string;
  shippingAddress: ShippingAddress;
  paymentMethod: 'cash_on_delivery';
  notes?: string;
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
    name: 'Classic Luxury Gold (Default)',
    nameAr: 'الفخامة الذهبية الكلاسيكية (الافتراضي)',
    description: 'Deep warm charcoal paired with rich royal gold & soft warm ivory.',
    colors: { ...DEFAULT_COLORS },
  },
  {
    id: 'emerald-velvet',
    name: 'Emerald Velvet & Sand',
    nameAr: 'الزمرد المخملي والرمل',
    description: 'Deep forest greens, soft sand, and warm muted brass accents.',
    colors: {
      charcoal: '#0F1A14',
      charcoalSoft: '#18261E',
      ivory: '#F4F7F4',
      ivory2: '#FAFDFB',
      sand: '#D9E2D8',
      gold: '#7D9D72',
      goldLight: '#9FBF94',
      goldPale: '#DCE8D7',
      ink: '#14211A',
      inkSoft: '#506759',
      clay: '#965239',
      indigo: '#2A4365',
      ochre: '#B08838',
      forest: '#2C5E3B',
      dune: '#B8A484',
    },
  },
  {
    id: 'royal-midnight',
    name: 'Royal Midnight & Pale Gold',
    nameAr: 'منتصف الليل الملكي والذهب الهادئ',
    description: 'Deep navy midnight blue with brilliant champagne gold accents.',
    colors: {
      charcoal: '#0D131F',
      charcoalSoft: '#161F33',
      ivory: '#F3F6FB',
      ivory2: '#FAFBFD',
      sand: '#D4DEED',
      gold: '#C5A866',
      goldLight: '#DFCA8F',
      goldPale: '#EFE5C8',
      ink: '#111B2C',
      inkSoft: '#56667F',
      clay: '#B85D43',
      indigo: '#4A69BD',
      ochre: '#C8963E',
      forest: '#3B6E52',
      dune: '#B5A07E',
    },
  },
  {
    id: 'desert-terracotta',
    name: 'Desert Terracotta & Dune',
    nameAr: 'التيراكوتا الصحراوية والكثبان',
    description: 'Warm earth terracotta, clay, and sunlit dunes.',
    colors: {
      charcoal: '#1C130E',
      charcoalSoft: '#291C15',
      ivory: '#F9F5F0',
      ivory2: '#FDFBF8',
      sand: '#EBDCCE',
      gold: '#BD6F4E',
      goldLight: '#DB8D6D',
      goldPale: '#F5DACD',
      ink: '#2D1B13',
      inkSoft: '#785A4D',
      clay: '#BF4E30',
      indigo: '#3D5A80',
      ochre: '#C4822B',
      forest: '#4F634A',
      dune: '#C99E75',
    },
  },
  {
    id: 'minimalist-monochrome',
    name: 'Modern Minimalist Monochrome',
    nameAr: 'المينيماليزم العصري الأحادي',
    description: 'Ultra-clean dark slate with crisp warm white and subtle bronze highlights.',
    colors: {
      charcoal: '#121214',
      charcoalSoft: '#1B1C20',
      ivory: '#F5F5F7',
      ivory2: '#FFFFFF',
      sand: '#E3E3E8',
      gold: '#8E8E93',
      goldLight: '#B0B0B8',
      goldPale: '#E2E2E8',
      ink: '#1C1C1E',
      inkSoft: '#636366',
      clay: '#8C4A3E',
      indigo: '#475569',
      ochre: '#94723C',
      forest: '#3F5145',
      dune: '#9E9282',
    },
  },
];

