import type { ApiResponse, Cart, CartTotals, Category, CheckoutPayload, Order, Product, User, AdminStats } from './types';

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'https://formation-humiliating-whale.abasthan.app/api';
const API_BASE = rawApiBase.replace(/\/+$/, '');

/* ============ BASE FETCH ============ */
async function apiFetch<T>(
  path: string,
  options: RequestInit & { locale?: string } = {}
): Promise<ApiResponse<T>> {
  const { locale, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(locale ? { 'Accept-Language': locale } : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Attach auth token if available (client side)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const sessionId = localStorage.getItem('sessionId');
    if (sessionId && !token) headers['X-Session-ID'] = sessionId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  // Token expired — try refresh
  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
      return retry.json();
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `API error ${res.status}`);
  }

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/* ============ AUTH ============ */
export const authApi = {
  register: (payload: { name: string; email: string; phone: string; password: string }) =>
    apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleAuth: (credential: string) =>
    apiFetch<{ user: User; accessToken: string; refreshToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  logout: (refreshToken: string) =>
    apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: (locale?: string) => apiFetch<User>('/auth/me', { locale }),

  updateProfile: (payload: { name?: string; phone?: string }) =>
    apiFetch<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (email: string) =>
    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  sendPhoneOtp: () =>
    apiFetch('/auth/send-phone-otp', { method: 'POST' }),

  verifyPhone: (code: string) =>
    apiFetch('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  sendEmailVerification: () =>
    apiFetch('/auth/send-email-verification', { method: 'POST' }),

  verifyEmail: (token: string) =>
    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};

/* ============ PRODUCTS ============ */
export const productsApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    minPrice?: number;
    maxPrice?: number;
  } = {}, locale = 'ar') => {
    try {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
      return await apiFetch<Product[]>(`/products?${q}`, { locale });
    } catch {
      // Fallback to static data
      const { STATIC_PRODUCTS } = await import('./staticProducts');
      let data = [...STATIC_PRODUCTS];
      if (params.category) data = data.filter(p => p.category.slug === params.category);
      if (params.search) {
        const q = params.search.toLowerCase();
        data = data.filter(p => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(q));
      }
      if (params.sort === 'price' && params.order === 'asc') data.sort((a, b) => a.price - b.price);
      if (params.sort === 'price' && params.order === 'desc') data.sort((a, b) => b.price - a.price);
      const page = params.page ?? 1;
      const limit = params.limit ?? 12;
      const start = (page - 1) * limit;
      return {
        success: true,
        data: data.slice(start, start + limit),
        pagination: { page, limit, total: data.length, pages: Math.ceil(data.length / limit) },
      };
    }
  },

  get: async (id: string, locale = 'ar') => {
    try {
      return await apiFetch<Product>(`/products/${id}`, { locale });
    } catch {
      const { STATIC_PRODUCTS } = await import('./staticProducts');
      const p = STATIC_PRODUCTS.find(x => x.id === id || x.sku === id);
      if (!p) throw new Error('Product not found');
      return { success: true, data: p };
    }
  },

  featured: async (locale = 'ar') => {
    try {
      const res = await apiFetch<Product[]>('/products/featured?limit=6', { locale });
      if (res.data && res.data.length > 0) return res;
      throw new Error('empty');
    } catch {
      const { STATIC_PRODUCTS } = await import('./staticProducts');
      return { success: true, data: STATIC_PRODUCTS.filter(p => p.featured) };
    }
  },

  related: async (id: string, locale = 'ar') => {
    try {
      return await apiFetch<Product[]>(`/products/${id}/related?limit=4`, { locale });
    } catch {
      const { STATIC_PRODUCTS } = await import('./staticProducts');
      const p = STATIC_PRODUCTS.find(x => x.id === id);
      const others = STATIC_PRODUCTS.filter(x => x.id !== id && x.category.slug === p?.category.slug).slice(0, 4);
      return { success: true, data: others };
    }
  },

  // Admin
  create: (payload: Partial<Product>) =>
    apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<Product>) =>
    apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  delete: (id: string) =>
    apiFetch(`/products/${id}`, { method: 'DELETE' }),

  lowStock: () => apiFetch<Product[]>('/products/low-stock'),
};

/* ============ CATEGORIES ============ */
export const categoriesApi = {
  list: async (locale = 'ar') => {
    try {
      return await apiFetch<Category[]>('/categories/active', { locale });
    } catch {
      const { STATIC_CATEGORIES } = await import('./staticProducts');
      return { success: true, data: STATIC_CATEGORIES as Category[] };
    }
  },
  all: async (locale = 'ar') => {
    try {
      return await apiFetch<Category[]>('/categories', { locale });
    } catch {
      const { STATIC_CATEGORIES } = await import('./staticProducts');
      return { success: true, data: STATIC_CATEGORIES as Category[] };
    }
  },
  get: (id: string, locale = 'ar') => apiFetch<Category>(`/categories/${id}`, { locale }),
  create: (payload: Partial<Category>) =>
    apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<Category>) =>
    apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string) => apiFetch(`/categories/${id}`, { method: 'DELETE' }),
};

/* ============ CART ============ */
export const cartApi = {
  get: (locale = 'ar') => apiFetch<Cart>('/cart', { locale }),
  add: (productId: string, quantity: number) =>
    apiFetch<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  update: (productId: string, quantity: number) =>
    apiFetch<Cart>(`/cart/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
  remove: (productId: string) =>
    apiFetch<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }),
  clear: () => apiFetch('/cart', { method: 'DELETE' }),
  totals: (governorate?: string) =>
    apiFetch<CartTotals>(`/cart/totals${governorate ? `?governorate=${governorate}` : ''}`),
  merge: (guestCartId: string) =>
    apiFetch('/cart/merge', { method: 'POST', body: JSON.stringify({ guestCartId }) }),
};

/* ============ CHECKOUT ============ */
export const checkoutApi = {
  create: (payload: CheckoutPayload, idempotencyKey: string) =>
    apiFetch<Order>('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': idempotencyKey } as HeadersInit,
    }),
  cancel: (orderId: string, reason: string) =>
    apiFetch(`/checkout/cancel/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

/* ============ ORDERS ============ */
export const ordersApi = {
  myOrders: (page = 1, locale = 'ar') =>
    apiFetch<Order[]>(`/orders/my?page=${page}&limit=10`, { locale }),

  get: (id: string, locale = 'ar') =>
    apiFetch<Order>(`/orders/${id}`, { locale }),

  getByNumber: (orderNumber: string, locale = 'ar') =>
    apiFetch<Order>(`/orders/number/${orderNumber}`, { locale }),

  stats: () => apiFetch<{ totalOrders: number; totalRevenue: number }>('/orders/stats'),

  // Admin
  adminList: (page = 1, status?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) q.set('status', status);
    return apiFetch<Order[]>(`/orders?${q}`);
  },

  updateStatus: (id: string, status: string, note?: string) =>
    apiFetch<Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),
};

/* ============ ADMIN ============ */
export const adminApi = {
  stats: () => apiFetch<AdminStats>('/orders/stats'),
  dashboardStats: () => apiFetch<any>('/admin/stats'),
  customers: (page = 1) => apiFetch<{ users: User[]; pagination: unknown }>(`/admin/customers?page=${page}`),
  getSettings: () => apiFetch<Record<string, string>>('/admin/settings'),
  updateSettings: (colors: Record<string, string>) =>
    apiFetch<Record<string, string>>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ colors }),
    }),

  // Excel export — returns a blob URL for direct download
  exportOrders: async (params?: { status?: string; from?: string; to?: string }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.from)   q.set('from', params.from);
    if (params?.to)     q.set('to', params.to);
    const url = `${API_BASE}/admin/export/orders${q.toString() ? '?' + q : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    return blob;
  },

  exportAnalytics: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const res = await fetch(`${API_BASE}/admin/export/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
};

/* ============ WISHLIST ============ */
export const wishlistApi = {
  get: () => apiFetch<{ products: Product[] }>('/wishlist'),
  add: (productId: string) => apiFetch(`/wishlist/${productId}`, { method: 'POST' }),
  remove: (productId: string) => apiFetch(`/wishlist/${productId}`, { method: 'DELETE' }),
  toggle: (productId: string) =>
    apiFetch<{ inWishlist: boolean }>(`/wishlist/${productId}/toggle`, { method: 'POST' }),
  check: (productId: string) =>
    apiFetch<{ inWishlist: boolean }>(`/wishlist/${productId}/check`),
  clear: () => apiFetch('/wishlist', { method: 'DELETE' }),
};

/* ============ REVIEWS ============ */
export interface Review {
  id: string;
  user: { id: string; name: string };
  rating: number;
  titleAr?: string;
  titleEn?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  createdAt: string;
}

export const reviewsApi = {
  list: (productId: string, page = 1, locale = 'ar') =>
    apiFetch<Review[]>(`/products/${productId}/reviews?page=${page}&limit=10`, { locale }),
  add: (productId: string, payload: { rating: number; comment: string; titleAr?: string; titleEn?: string }) =>
    apiFetch<Review>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markHelpful: (reviewId: string) =>
    apiFetch(`/reviews/${reviewId}/helpful`, { method: 'POST' }),
  remove: (reviewId: string) =>
    apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' }),
};

/* ============ SITE CONTENT ============ */
export const contentApi = {
  getAll: () => apiFetch<Record<string, any>>('/content'),
  get: (section: string) => apiFetch<Record<string, any>>(`/content/${section}`),
  adminGetAll: () => apiFetch<{ data: Record<string, any>; sections: string[] }>('/admin/content'),
  update: (section: string, data: Record<string, any>) =>
    apiFetch<Record<string, any>>(`/admin/content/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),
};

/* ============ ADS ============ */
export interface Ad {
  _id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl: string;
  publicId?: string;
  linkUrl?: string;
  placement: 'homepage_banner' | 'homepage_mid' | 'shop_sidebar' | 'product_page';
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export const adsApi = {
  // Public
  list: (placement?: string) =>
    apiFetch<Ad[]>(`/ads${placement ? `?placement=${placement}` : ''}`),

  // Admin
  adminList: () => apiFetch<Ad[]>('/admin/ads'),
  create: (payload: Partial<Ad>) =>
    apiFetch<Ad>('/admin/ads', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<Ad>) =>
    apiFetch<Ad>(`/admin/ads/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggle: (id: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/ads/${id}/toggle`, { method: 'PATCH' }),
  delete: (id: string) =>
    apiFetch(`/admin/ads/${id}`, { method: 'DELETE' }),
};
export interface ShippingAddressPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  governorate: string;
  postalCode?: string;
  isDefault?: boolean;
}

export const addressesApi = {
  list: () => apiFetch<ShippingAddressPayload[]>('/addresses'),
  create: (payload: ShippingAddressPayload) =>
    apiFetch<ShippingAddressPayload>('/addresses', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<ShippingAddressPayload>) =>
    apiFetch<ShippingAddressPayload>(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => apiFetch(`/addresses/${id}`, { method: 'DELETE' }),
};
