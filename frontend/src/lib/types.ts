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
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
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
