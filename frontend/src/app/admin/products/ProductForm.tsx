'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, categoriesApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/AdminInput';
import { resolveProductImageUrl } from '@/lib/utils';
import type { Category, Product } from '@/lib/types';

interface Props { productId?: string; }

// ── Direct Cloudinary upload from browser ─────────────────────────────────────
async function uploadToCloudinaryDirect(files: File[]): Promise<string[]> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error('Cloudinary env vars missing');

  return Promise.all(files.map(async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    fd.append('folder', 'rawaqa/products');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Cloudinary upload failed');
    }
    const data = await res.json();
    return data.secure_url as string;
  }));
}

const EMPTY = {
  sku: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '',
  longDescriptionAr: '', longDescriptionEn: '', price: '', compareAtPrice: '',
  category: '', onHandQuantity: '0', lowStockThreshold: '5',
  featured: false, status: 'active' as 'active' | 'draft' | 'inactive' | 'archived' | 'out_of_stock',
  images: '',
  colors: [] as string[],
};

export default function ProductForm({ productId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!!productId);

  useEffect(() => {
    categoriesApi.all('ar').then(r => {
      const raw = r.data ?? [];
      const list = raw.map((c: any) => ({
        ...c,
        id: c.id || c._id,
      }));
      setCategories(list);
    }).catch(() => {});
    if (productId) {
      productsApi.get(productId, 'en').then(r => {
        const p = r.data as Product;
        setForm({
          sku: p.sku,
          nameAr: p.nameAr, nameEn: p.nameEn,
          descriptionAr: p.descriptionAr, descriptionEn: p.descriptionEn,
          longDescriptionAr: p.longDescriptionAr || '', longDescriptionEn: p.longDescriptionEn || '',
          price: String(p.price),
          compareAtPrice: String(p.compareAtPrice || ''),
          category: p.category?.id || (p.category as any)?._id || (typeof p.category === 'string' ? p.category : ''),
          onHandQuantity: String(p.inventory?.onHandQuantity ?? 0),
          lowStockThreshold: String(p.inventory?.lowStockThreshold ?? 5),
          featured: Boolean(p.featured),
          status: (p.status === 'draft' || p.status === 'archived' || p.status === 'out_of_stock') ? p.status : 'active',
          images: p.images?.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean).join(', ') || '',
          colors: Array.isArray((p as any).colors) ? (p as any).colors : [],
        });
        setLoading(false);
      }).catch(() => router.push('/admin/products'));
    }
  }, [productId, router]);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku.trim()) {
      showToast('SKU is required / رمز المنتج مطلوب', 'error');
      return;
    }
    if (!form.nameEn.trim() || !form.nameAr.trim()) {
      showToast('Product name in both English and Arabic is required / اسم المنتج بالعربية والإنجليزية مطلوب', 'error');
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      showToast('Please enter a valid price / يرجى إدخال سعر صحيح', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sku: form.sku.trim(),
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        descriptionAr: form.descriptionAr.trim() || form.nameAr.trim(),
        descriptionEn: form.descriptionEn.trim() || form.nameEn.trim(),
        longDescriptionAr: form.longDescriptionAr.trim(),
        longDescriptionEn: form.longDescriptionEn.trim(),
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        category: form.category || undefined,
        inventory: {
          onHandQuantity: Number(form.onHandQuantity) || 0,
          reservedQuantity: 0,
          lowStockThreshold: Number(form.lowStockThreshold) || 5,
        },
        featured: form.featured,
        status: form.status,
        images: form.images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean),
        colors: form.colors.filter(c => c.trim()),
      };
      if (productId) {
        await productsApi.update(productId, payload as Partial<Product>);
        showToast('Product updated successfully! / تم حفظ التعديلات بنجاح', 'success');
        router.push('/admin/products');
        router.refresh();
      } else {
        await productsApi.create(payload as Partial<Product>);
        showToast('Product created successfully! / تم إنشاء المنتج بنجاح', 'success');
        router.push('/admin/products');
        router.refresh();
      }
    } catch (err: unknown) {
      showToast((err as Error).message || 'Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const S = { color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' };
  const CARD = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16, padding: 24 };

  if (loading) return <div style={{ color: 'rgba(247,244,236,.4)' }}>Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={S}>
          {productId ? 'Edit Product' : 'New Product'}
        </h1>
        <button type="button" onClick={() => router.push('/admin/products')} style={{ color: 'rgba(247,244,236,.4)', fontSize: '.82rem' }}>
          ← Back
        </button>
      </div>

      {/* Basic */}
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Basic Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput label="SKU *" value={form.sku} onChange={set('sku')} required placeholder="BB-001" />
          <AdminSelect label="Category / القسم" value={form.category} onChange={set('category')}>
            <option value="">Select category / اختر القسم</option>
            {categories.map((c: any) => {
              const catId = c.id || c._id;
              return (
                <option key={catId} value={catId}>
                  {c.nameAr ? `${c.nameAr} (${c.nameEn || ''})` : c.nameEn}
                </option>
              );
            })}
          </AdminSelect>
          <AdminInput label="Name (English) *" value={form.nameEn} onChange={set('nameEn')} required />
          <AdminInput label="Name (Arabic) *" value={form.nameAr} onChange={set('nameAr')} required dir="rtl" />
          <div className="sm:col-span-2">
            <AdminTextarea label="Description (English)" value={form.descriptionEn} onChange={set('descriptionEn')} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="Description (Arabic)" value={form.descriptionAr} onChange={set('descriptionAr')} rows={2} dir="rtl" />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="Long Description (English)" value={form.longDescriptionEn} onChange={set('longDescriptionEn')} rows={3} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="Long Description (Arabic)" value={form.longDescriptionAr} onChange={set('longDescriptionAr')} rows={3} dir="rtl" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Pricing</p>
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="Price (EGP) *" type="number" min="0" step="1" value={form.price} onChange={set('price')} required />
          <AdminInput label="Compare At Price (EGP)" type="number" min="0" step="1" value={form.compareAtPrice} onChange={set('compareAtPrice')} />
        </div>
      </div>

      {/* Inventory */}
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Inventory</p>
        <div className="grid grid-cols-2 gap-4">
          <AdminInput label="On Hand Quantity" type="number" min="0" value={form.onHandQuantity} onChange={set('onHandQuantity')} />
          <AdminInput label="Low Stock Threshold" type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
        </div>
      </div>

      {/* Colors */}
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Colors / الألوان</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {form.colors.map((color, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
            >
              <span
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ background: color }}
              />
              <span className="text-sm" style={{ color: '#F7F4EC' }}>{color}</span>
              <button
                type="button"
                onClick={() => {
                  const newColors = [...form.colors];
                  newColors.splice(idx, 1);
                  setForm(f => ({ ...f, colors: newColors }));
                }}
                className="text-red-400 hover:text-red-300 text-xs ml-1"
                title="Remove color"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'rgba(247,244,236,.45)' }}>Add Color / إضافة لون</label>
            <div className="flex gap-2">
              <input
                type="color"
                id="colorPicker"
                defaultValue="#D2B56A"
                className="w-12 h-10 rounded cursor-pointer border-0"
                style={{ background: 'transparent' }}
              />
              <input
                type="text"
                id="colorInput"
                placeholder="#D2B56A or red"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  color: '#F7F4EC',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.currentTarget;
                    const val = input.value.trim();
                    if (val && !form.colors.includes(val)) {
                      setForm(f => ({ ...f, colors: [...f.colors, val] }));
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
              const colorInput = document.getElementById('colorInput') as HTMLInputElement;
              const val = colorInput.value.trim() || colorPicker.value;
              if (val && !form.colors.includes(val)) {
                setForm(f => ({ ...f, colors: [...f.colors, val] }));
                colorInput.value = '';
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(210,181,106,.15)', border: '1px solid #D2B56A', color: '#D2B56A' }}
          >
            + Add
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(247,244,236,.35)' }}>
          Use hex codes (#FF0000) or color names (red, blue, gold). Press Enter or click Add.
        </p>
      </div>

      {/* Images */}
      <div style={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: '#D2B56A' }}>Images</p>
          <label className="text-xs font-semibold px-3 py-1.5 rounded-pill cursor-pointer transition-all" style={{ background: uploading ? 'rgba(210,181,106,.2)' : 'rgba(210,181,106,.15)', border: '1px solid #D2B56A', color: '#D2B56A' }}>
            {uploading ? 'Uploading...' : '📁 Upload From Computer'}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                setUploading(true);
                try {
                  const uploadedUrls = await uploadToCloudinaryDirect(Array.from(files));
                  const currentUrls = form.images ? form.images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
                  const combined = [...currentUrls, ...uploadedUrls];
                  setForm(f => ({ ...f, images: combined.join(', ') }));
                  showToast(`${uploadedUrls.length} image(s) uploaded successfully!`, 'success');
                } catch (err: any) {
                  showToast(err.message || 'Failed to upload images', 'error');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>

        <AdminTextarea
          label="Image URLs (comma separated, new line per image, or uploaded from computer)"
          value={form.images}
          onChange={set('images')}
          rows={3}
          placeholder="https://cdn.example.com/img1.jpg, /products/chair-lounge-new/img-1.jpg"
        />

        {/* Thumbnail Preview Grid */}
        {form.images && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
            {form.images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map((rawUrl, idx) => {
              const previewSrc = resolveProductImageUrl(rawUrl);

              return (
                <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                  <img
                    src={previewSrc}
                    alt={`Product img ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/products/cloud-lounger.jpg';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const list = form.images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                      list.splice(idx, 1);
                      setForm(f => ({ ...f, images: list.join(', ') }));
                    }}
                    className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center cursor-pointer shadow-sm"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>Settings</p>
        <div className="grid grid-cols-2 gap-4">
          <AdminSelect label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="out_of_stock">Out of Stock</option>
          </AdminSelect>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'rgba(247,244,236,.45)' }}>Featured</label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                className="w-4 h-4"
                style={{ accentColor: '#D2B56A' }}
              />
              <span className="text-sm" style={{ color: '#F7F4EC' }}>Show in featured section</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-semibold px-6 py-3 rounded-pill transition-opacity"
          style={{ background: '#D2B56A', color: '#15130F', opacity: saving ? .6 : 1 }}
        >
          {saving ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="text-sm px-6 py-3 rounded-pill"
          style={{ border: '1px solid rgba(210,181,106,.25)', color: 'rgba(247,244,236,.6)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
