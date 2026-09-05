'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Cart, CartItem } from '@/lib/types';
import { STATIC_PRODUCTS } from '@/lib/staticProducts';
import { cartApi } from '@/lib/api';

const STORAGE_KEY = 'rawaqa_cart';

function buildLocalCart(items: CartItem[]): Cart {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  return { id: 'local', items, itemCount: items.reduce((s, i) => s + i.quantity, 0), subtotal };
}

function loadItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function saveItems(items: CartItem[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, imageIndex?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeWithBackend: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cart: null, itemCount: 0, isLoading: false,
  fetchCart: async () => {}, addToCart: async () => {},
  updateItem: async () => {}, removeItem: async () => {},
  clearCart: async () => {}, mergeWithBackend: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mergedRef = useRef(false);

  useEffect(() => { setItems(loadItems()); }, []);

  const persist = useCallback((newItems: CartItem[]) => {
    setItems(newItems);
    saveItems(newItems);
  }, []);

  const fetchCart = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { setItems(loadItems()); return; }
    try {
      setIsLoading(true);
      const res = await cartApi.get();
      if (res.data?.items?.length) {
        const mapped: CartItem[] = res.data.items.map((i: CartItem) => i);
        persist(mapped);
      }
    } catch {
      setItems(loadItems());
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  // Merge local cart into backend after login
  const mergeWithBackend = useCallback(async () => {
    if (mergedRef.current) return;
    mergedRef.current = true;
    const local = loadItems();
    if (!local.length) return;
    try {
      for (const item of local) {
        await cartApi.add(item.product.id, item.quantity);
      }
      localStorage.removeItem(STORAGE_KEY);
      await fetchCart();
    } catch {
      // keep local cart if merge fails
    }
  }, [fetchCart]);

  const addToCart = useCallback(async (productId: string, quantity = 1, imageIndex = 0) => {
    const product = STATIC_PRODUCTS.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    const selectedImage = product.images?.[imageIndex] ?? product.images?.[0];

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    // Try backend first if logged in
    if (token) {
      try {
        await cartApi.add(productId, quantity);
        await fetchCart();
        return;
      } catch { /* fall through to local */ }
    }

    // Local cart
    setItems(prev => {
      const existing = prev.find(i => i.product.id === productId);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map(i =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + quantity, total: (i.quantity + quantity) * i.price }
            : i
        );
      } else {
        newItems = [...prev, {
          product: {
            id: product.id, nameAr: product.nameAr, nameEn: product.nameEn,
            price: product.price, images: selectedImage ? [selectedImage] : product.images,
            sku: product.sku,
          },
          quantity, price: product.price, total: product.price * quantity,
        }];
      }
      saveItems(newItems);
      return newItems;
    });
  }, [fetchCart]);

  const updateItem = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      try { await cartApi.update(productId, quantity); await fetchCart(); return; } catch {}
    }
    setItems(prev => {
      const newItems = prev.map(i =>
        i.product.id === productId ? { ...i, quantity, total: i.price * quantity } : i
      );
      saveItems(newItems);
      return newItems;
    });
  }, [fetchCart]);

  const removeItem = useCallback(async (productId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      try { await cartApi.remove(productId); await fetchCart(); return; } catch {}
    }
    setItems(prev => {
      const newItems = prev.filter(i => i.product.id !== productId);
      saveItems(newItems);
      return newItems;
    });
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) { try { await cartApi.clear(); } catch {} }
    persist([]);
    mergedRef.current = false;
  }, [persist]);

  return (
    <CartContext.Provider value={{
      cart: buildLocalCart(items), itemCount: buildLocalCart(items).itemCount,
      isLoading, fetchCart, addToCart, updateItem, removeItem, clearCart, mergeWithBackend,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
