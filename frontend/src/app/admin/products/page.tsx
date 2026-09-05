'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import AdminTable from '@/components/admin/AdminTable';
import type { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    productsApi.list({ limit: 50, search: search || undefined }, 'en')
      .then(r => setProducts(r.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      showToast('Product deleted', 'success');
      load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const columns = [
    {
      key: 'nameEn', label: 'Product',
      render: (p: Product) => (
        <div>
          <p className="font-medium truncate" style={{ color: '#F7F4EC' }}>{p.nameEn}</p>
          <p className="text-[.7rem] truncate" style={{ color: 'rgba(247,244,236,.35)' }}>{p.nameAr}</p>
        </div>
      ),
    },
    { key: 'sku', label: 'SKU', render: (p: Product) => <span className="font-mono text-xs" style={{ color: '#D2B56A' }}>{p.sku}</span> },
    { key: 'price', label: 'Price', render: (p: Product) => formatPrice(p.price, 'en') },
    {
      key: 'inventory', label: 'Stock',
      render: (p: Product) => (
        <span style={{ color: p.inventory.availableQuantity <= p.inventory.lowStockThreshold ? '#A8543A' : '#4B5B45', fontWeight: 600 }}>
          {p.inventory.availableQuantity}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (p: Product) => (
        <span className="text-xs px-2 py-0.5 rounded-pill" style={{
          background: p.status === 'active' ? 'rgba(75,91,69,.3)' : 'rgba(168,84,58,.2)',
          color: p.status === 'active' ? '#a3c49a' : '#e07a5f',
        }}>
          {p.status}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${p.id}`} className="text-xs hover:underline" style={{ color: '#D2B56A' }}>Edit</Link>
          <button onClick={() => handleDelete(p.id, p.nameEn)} className="text-xs hover:underline" style={{ color: '#A8543A' }}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>Products</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.35)' }}>{products.length} total</p>
        </div>
        <Link href="/admin/products/new" className="text-sm font-semibold px-5 py-2.5 rounded-pill" style={{ background: '#D2B56A', color: '#15130F' }}>
          + Add Product
        </Link>
      </div>

      <input
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-xl px-4 py-2.5 text-sm"
        style={{ background: '#1E1B15', border: '1px solid rgba(210,181,106,.2)', color: '#F7F4EC', outline: 'none' }}
      />

      <AdminTable columns={columns} data={products} loading={loading} keyField="id" emptyText="No products found" />
    </div>
  );
}
