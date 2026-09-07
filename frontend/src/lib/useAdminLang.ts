'use client';

import { useEffect, useState } from 'react';

export type AdminLang = 'en' | 'ar';
const STORAGE_KEY = 'rawaqa_admin_lang';

// Admin UI labels — add more pages as needed
const LABELS = {
  en: {
    // Dashboard
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    dashboard_sub: "Here's what's happening",
    revenue_month: 'Revenue This Month',
    orders_month: 'Orders This Month',
    avg_order: 'Avg Order Value',
    total_customers: 'Total Customers',
    per_order: 'per completed order',
    vs_last: 'vs',
    last_month: 'last month',
    this_month: 'this month',
    revenue_7d: 'Revenue — Last 7 Days',
    orders_breakdown: 'Orders Breakdown',
    top_selling: '🏆 Top Selling Products',
    low_stock: '⚠️ Low Stock Alert',
    no_sales: 'No sales data yet',
    all_stocked: 'All products well stocked',
    recent_orders: '🕐 Recent Orders',
    no_orders: 'No orders yet',
    items: 'item',
    items_plural: 'items',
    activity: '📈 This Month at a Glance',
    new_customers: 'New Customers',
    orders_placed: 'Orders Placed',
    orders_pending: 'Orders Pending',
    orders_delivered: 'Orders Delivered',
    cancelled: 'Cancelled',
    low_stock_skus: 'Low Stock SKUs',
    quick_actions: 'Quick Actions',
    add_product: 'Add Product',
    categories: 'Categories',
    manage_ads: 'Manage Ads',
    edit_content: 'Edit Content',
    all_orders: 'All Orders',
    site_settings: 'Site Settings',
    new_product: '+ New Product',
    view_orders: 'View Orders →',
    sold: 'sold',
    out_of_stock: 'Out of stock',
    left: 'left',
    view_all: 'View all →',
    manage: 'Manage →',
    no_top_products: 'No top products yet',
    users: 'users',
    orders: 'orders',
    pending: 'pending',
    delivered: 'delivered',
    products: 'products',
    egp: 'EGP',
  },
  ar: {
    greeting_morning: 'صباح الخير',
    greeting_afternoon: 'مساء الخير',
    greeting_evening: 'مساء النور',
    dashboard_sub: 'إليك ما يحدث الآن',
    revenue_month: 'إيرادات هذا الشهر',
    orders_month: 'الطلبات هذا الشهر',
    avg_order: 'متوسط قيمة الطلب',
    total_customers: 'إجمالي العملاء',
    per_order: 'لكل طلب مكتمل',
    vs_last: 'مقارنةً بـ',
    last_month: 'الشهر الماضي',
    this_month: 'هذا الشهر',
    revenue_7d: 'الإيرادات — آخر 7 أيام',
    orders_breakdown: 'توزيع الطلبات',
    top_selling: '🏆 الأكثر مبيعاً',
    low_stock: '⚠️ تحذير المخزون',
    no_sales: 'لا توجد بيانات مبيعات بعد',
    all_stocked: 'جميع المنتجات متوفرة',
    recent_orders: '🕐 أحدث الطلبات',
    no_orders: 'لا توجد طلبات بعد',
    items: 'منتج',
    items_plural: 'منتجات',
    activity: '📈 ملخص الشهر الحالي',
    new_customers: 'عملاء جدد',
    orders_placed: 'طلبات مُسجَّلة',
    orders_pending: 'طلبات معلقة',
    orders_delivered: 'طلبات مُسلَّمة',
    cancelled: 'ملغاة',
    low_stock_skus: 'منتجات منخفضة المخزون',
    quick_actions: 'الإجراءات السريعة',
    add_product: 'إضافة منتج',
    categories: 'الأقسام',
    manage_ads: 'إدارة الإعلانات',
    edit_content: 'تعديل المحتوى',
    all_orders: 'جميع الطلبات',
    site_settings: 'إعدادات الموقع',
    new_product: '+ منتج جديد',
    view_orders: 'عرض الطلبات ←',
    sold: 'مباع',
    out_of_stock: 'نفذ',
    left: 'متبقي',
    view_all: 'عرض الكل ←',
    manage: 'إدارة ←',
    no_top_products: 'لا توجد بيانات مبيعات بعد',
    users: 'مستخدمين',
    orders: 'طلبات',
    pending: 'معلق',
    delivered: 'مُسلَّم',
    products: 'منتجات',
    egp: 'ج.م',
  },
} as const;

export type AdminLabels = typeof LABELS.en;

export function useAdminLang() {
  const [lang, setLang] = useState<AdminLang>('en'); // 'en' on server to avoid hydration mismatch

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminLang | null;
    if (stored === 'ar' || stored === 'en') setLang(stored);

    // Listen for changes from the layout toggle
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'ar' || e.newValue === 'en')) {
        setLang(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { lang, isAr: lang === 'ar', t: LABELS[lang] as AdminLabels };
}
