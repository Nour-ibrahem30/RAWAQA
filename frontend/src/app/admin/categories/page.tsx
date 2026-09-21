'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { categoriesApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import AdminTable from '@/components/admin/AdminTable';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/AdminInput';
import type { Category } from '@/lib/types';

const CARD = {
  background: '#15130F',
  border: '1px solid rgba(210,181,106,.15)',
  borderRadius: 20,
  padding: 24,
};

const GOLD   = '#D2B56A';
const BORDER = 'rgba(210,181,106,.15)';

// ── Direct Cloudinary upload (bypasses backend / Cloudflare Workers) ──────────
async function uploadToCloudinaryDirect(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset    = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error('Cloudinary env vars missing');

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);
  fd.append('folder', 'rawaqa/categories');

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
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  // Image state
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nameEn:        '',
    nameAr:        '',
    descriptionEn: '',
    descriptionAr: '',
    slug:          '',
    status:        'active' as 'active' | 'inactive',
    image:         '',
    imageAlt:      '', // ← SEO alt text
  });

  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    categoriesApi.all('ar')
      .then(r => setCategories((r.data ?? []).map((c: any) => ({ ...c, id: c.id || c._id }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetImage = () => { setImageFile(null); setImagePreview(''); };

  const openNew = () => {
    setForm({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', slug: '', status: 'active', image: '', imageAlt: '' });
    resetImage();
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    setForm({
      nameEn:        c.nameEn        || '',
      nameAr:        c.nameAr        || '',
      descriptionEn: c.descriptionEn || '',
      descriptionAr: c.descriptionAr || '',
      slug:          c.slug || c.slugEn || c.slugAr || '',
      status:        c.status || (c.isActive === false ? 'inactive' : 'active'),
      image:         c.image         || '',
      imageAlt:      c.imageAlt      || '',
    });
    setImagePreview(c.image || '');
    setImageFile(null);
    setEditId(c.id || c._id);
    setShowForm(true);
  };

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('يرجى اختيار ملف صورة صالح', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('يجب أن تكون الصورة أقل من 5 MB', 'error'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Auto-fill imageAlt from filename if empty
    if (!form.imageAlt) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setForm(f => ({ ...f, imageAlt: name }));
    }
  };

  const removeImage = () => {
    resetImage();
    setForm(f => ({ ...f, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      showToast('يرجى إدخال اسم القسم بالعربية والإنجليزية', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload directly to Cloudinary from browser (bypasses backend)
      let imageUrl = form.image;
      if (imageFile) {
        setUploadingImg(true);
        try {
          imageUrl = await uploadToCloudinaryDirect(imageFile);
        } catch (err: unknown) {
          showToast((err as Error).message || 'فشل رفع الصورة', 'error');
          return;
        } finally {
          setUploadingImg(false);
        }
      }

      // 2. Build payload
      const cleanSlug = form.slug.trim().toLowerCase() ||
        form.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload: Record<string, unknown> = {
        nameAr:        form.nameAr.trim(),
        nameEn:        form.nameEn.trim(),
        descriptionAr: form.descriptionAr.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        slug:    cleanSlug,
        slugAr:  cleanSlug,
        slugEn:  cleanSlug,
        status:  form.status,
        isActive: form.status === 'active',
        image:    imageUrl || null,
        imageAlt: form.imageAlt.trim() || null,
      };

      // 3. Save
      if (editId) {
        await categoriesApi.update(editId, payload as any);
        showToast('تم تحديث القسم بنجاح ✓', 'success');
      } else {
        await categoriesApi.create(payload as any);
        showToast('تم إنشاء القسم بنجاح ✓', 'success');
      }

      setShowForm(false);
      resetImage();
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || 'فشل حفظ القسم', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟`)) return;
    try {
      await categoriesApi.delete(id);
      showToast('تم حذف القسم', 'success');
      load();
    } catch (e: unknown) {
      showToast((e as Error).message || 'فشل الحذف', 'error');
    }
  };

  const columns = [
    {
      key: 'nameEn', label: 'Category / القسم',
      render: (c: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {c.image ? (
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${BORDER}` }}>
              <Image src={c.image} alt={c.imageAlt || c.nameAr || c.nameEn} width={40} height={40} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', background: 'rgba(210,181,106,.08)', border: `1px dashed ${BORDER}` }}>
              🖼
            </div>
          )}
          <div>
            <p style={{ color: '#F7F4EC', fontWeight: 600 }}>{c.nameAr || c.nameEn}</p>
            <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.75rem' }}>{c.nameEn}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'slug', label: 'Slug',
      render: (c: Category) => <span className="font-mono text-xs" style={{ color: GOLD }}>{c.slug}</span>,
    },
    {
      key: 'productCount', label: 'المنتجات',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(210,181,106,.1)', color: GOLD }}>
          {c.productCount ?? 0}
        </span>
      ),
    },
    {
      key: 'status', label: 'الحالة',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{
          background: c.status === 'active' ? 'rgba(75,181,69,.15)' : 'rgba(168,84,58,.2)',
          color:      c.status === 'active' ? '#4ADE80'              : '#e07a5f',
          border: `1px solid ${c.status === 'active' ? 'rgba(75,181,69,.3)' : 'rgba(168,84,58,.3)'}`,
        }}>
          {c.status === 'active' ? 'نشط' : 'معطل'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (c: any) => (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={() => openEdit(c)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(210,181,106,.1)', color: GOLD, border: `1px solid rgba(210,181,106,.2)` }}>تعديل</button>
          <button onClick={() => handleDelete(c.id || c._id, c.nameAr || c.nameEn)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(239,68,68,.1)', color: '#F87171', border: '1px solid rgba(239,68,68,.2)' }}>حذف</button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>إدارة الأقسام</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.4)' }}>{categories.length} أقسام متاحة</p>
        </div>
        <button onClick={openNew} className="text-sm font-semibold px-5 py-2.5 rounded-pill shadow-sm transition-all hover:opacity-90"
          style={{ background: GOLD, color: '#15130F' }}>
          + إضافة قسم جديد
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={CARD} className="flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            {editId ? 'تعديل القسم' : 'قسم جديد'}
          </p>

          {/* ── Image upload ── */}
          <div>
            <p style={{ fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.6rem' }}>
              صورة القسم (اختياري)
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 120, height: 120, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                  border: `2px dashed ${imagePreview ? GOLD : BORDER}`,
                  cursor: 'pointer', position: 'relative',
                  background: imagePreview ? 'transparent' : 'rgba(210,181,106,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 200ms',
                }}
              >
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '1.8rem', opacity: .4 }}>🖼</div>
                    <p style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.35)', marginTop: '.3rem' }}>اختر صورة</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', justifyContent: 'center' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}
                  style={{ padding: '.5rem 1.2rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600, background: 'rgba(210,181,106,.1)', color: GOLD, border: `1px solid rgba(210,181,106,.25)`, cursor: 'pointer' }}>
                  {uploadingImg ? '⬆ جاري الرفع...' : imagePreview ? '🔄 تغيير الصورة' : '📂 رفع صورة'}
                </button>
                {imagePreview && (
                  <button type="button" onClick={removeImage}
                    style={{ padding: '.4rem 1.2rem', borderRadius: 999, fontSize: '.75rem', background: 'rgba(239,68,68,.08)', color: '#F87171', border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer' }}>
                    🗑 حذف الصورة
                  </button>
                )}
                <p style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.25)', lineHeight: 1.5 }}>JPG أو PNG أو WebP — حجم أقصى 5 MB</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {/* ── Text fields ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput label="اسم القسم بالعربية *" value={form.nameAr}  onChange={set('nameAr')}  required dir="rtl" placeholder="مثال: استرخاء" />
            <AdminInput label="Name (English) *"      value={form.nameEn}  onChange={set('nameEn')}  required placeholder="e.g. Relax" />
            <AdminInput label="Slug (URL)"             value={form.slug}    onChange={set('slug')}    placeholder="e.g. relax" />
            <AdminSelect label="الحالة / Status"       value={form.status}  onChange={set('status')}>
              <option value="active">نشط — يظهر في المتجر</option>
              <option value="inactive">معطل — مخفي</option>
            </AdminSelect>

            {/* SEO Alt text — full width */}
            <div className="sm:col-span-2">
              <AdminInput
                label="وصف الصورة (Alt) — للـ SEO"
                value={form.imageAlt}
                onChange={set('imageAlt')}
                placeholder="مثال: كرسي بين باج جلد للاسترخاء — رواقة"
                dir="rtl"
              />
              <p style={{ fontSize: '.62rem', color: 'rgba(247,244,236,.25)', marginTop: '.3rem' }}>
                يُستخدم كـ alt text للصورة ويحسّن ظهور القسم في نتائج البحث
              </p>
            </div>

            <div className="sm:col-span-2">
              <AdminTextarea label="الوصف بالعربية" value={form.descriptionAr} onChange={set('descriptionAr')} rows={2} dir="rtl" />
            </div>
            <div className="sm:col-span-2">
              <AdminTextarea label="Description (English)" value={form.descriptionEn} onChange={set('descriptionEn')} rows={2} />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 mt-1">
            <button type="submit" disabled={saving || uploadingImg}
              style={{ padding: '.6rem 1.75rem', borderRadius: 999, fontSize: '.85rem', fontWeight: 700, background: GOLD, color: '#15130F', cursor: 'pointer', opacity: (saving || uploadingImg) ? .65 : 1 }}>
              {uploadingImg ? '⬆ جاري رفع الصورة...' : saving ? 'جاري الحفظ...' : editId ? '💾 حفظ التعديلات' : '✓ إنشاء القسم'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetImage(); }}
              style={{ padding: '.6rem 1.5rem', borderRadius: 999, fontSize: '.85rem', border: `1px solid ${BORDER}`, color: 'rgba(247,244,236,.6)', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <AdminTable columns={columns} data={categories} loading={loading} keyField="id" emptyText="لا توجد أقسام بعد" />
    </div>
  );
}
import { useToast } from '@/context/ToastContext';
import AdminTable from '@/components/admin/AdminTable';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/AdminInput';
import type { Category } from '@/lib/types';

const CARD = {
  background: '#15130F',
  border: '1px solid rgba(210,181,106,.15)',
  borderRadius: 20,
  padding: 24,
};

const GOLD   = '#D2B56A';
const BORDER = 'rgba(210,181,106,.15)';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  // Image state
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nameEn:        '',
    nameAr:        '',
    descriptionEn: '',
    descriptionAr: '',
    slug:          '',
    status:        'active' as 'active' | 'inactive',
    image:         '',    // ← stored URL after upload
  });

  const { showToast } = useToast();

  // ─── Data loading ────────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    categoriesApi.all('ar')
      .then(r => {
        setCategories((r.data ?? []).map((c: any) => ({ ...c, id: c.id || c._id })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ─── Open form helpers ───────────────────────────────────────────────────────
  const resetImage = () => { setImageFile(null); setImagePreview(''); };

  const openNew = () => {
    setForm({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', slug: '', status: 'active', image: '' });
    resetImage();
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    const id = c.id || c._id;
    setForm({
      nameEn:        c.nameEn        || '',
      nameAr:        c.nameAr        || '',
      descriptionEn: c.descriptionEn || '',
      descriptionAr: c.descriptionAr || '',
      slug:          c.slug || c.slugEn || c.slugAr || '',
      status:        c.status || (c.isActive === false ? 'inactive' : 'active'),
      image:         c.image         || '',
    });
    setImagePreview(c.image || '');
    setImageFile(null);
    setEditId(id);
    setShowForm(true);
  };

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ─── Image selection ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file / يرجى اختيار ملف صورة صالح', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB / يجب أن تكون الصورة أقل من 5 ميجابايت', 'error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    resetImage();
    setForm(f => ({ ...f, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      showToast('يرجى إدخال اسم القسم بالعربية والإنجليزية', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload image first if a new file was selected
      let imageUrl = form.image;
      if (imageFile) {
        setUploadingImg(true);
        try {
          const urls = await uploadApi.direct([imageFile]);
          imageUrl = urls[0] ?? '';
        } catch {
          showToast('فشل رفع الصورة — يرجى المحاولة مرة أخرى / Image upload failed', 'error');
          return;
        } finally {
          setUploadingImg(false);
        }
      }

      // 2. Build category payload
      const cleanSlug = form.slug.trim().toLowerCase() ||
        form.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload: Record<string, unknown> = {
        nameAr:        form.nameAr.trim(),
        nameEn:        form.nameEn.trim(),
        descriptionAr: form.descriptionAr.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        slug:    cleanSlug,
        slugAr:  cleanSlug,
        slugEn:  cleanSlug,
        status:  form.status,
        isActive: form.status === 'active',
        ...(imageUrl !== undefined ? { image: imageUrl || null } : {}),
      };

      // 3. Create or update
      if (editId) {
        await categoriesApi.update(editId, payload as any);
        showToast('تم تحديث القسم بنجاح ✓', 'success');
      } else {
        await categoriesApi.create(payload as any);
        showToast('تم إنشاء القسم بنجاح ✓', 'success');
      }

      setShowForm(false);
      resetImage();
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || 'فشل حفظ القسم', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟`)) return;
    try {
      await categoriesApi.delete(id);
      showToast('تم حذف القسم / Category deleted', 'success');
      load();
    } catch (e: unknown) {
      showToast((e as Error).message || 'فشل الحذف', 'error');
    }
  };

  // ─── Table columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'nameEn', label: 'Category / القسم',
      render: (c: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Category image thumbnail */}
          {c.image ? (
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${BORDER}` }}>
              <Image src={c.image} alt={c.nameAr || c.nameEn} width={40} height={40} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              background: 'rgba(210,181,106,.08)', border: `1px dashed ${BORDER}`,
            }}>
              🖼
            </div>
          )}
          <div>
            <p style={{ color: '#F7F4EC', fontWeight: 600 }}>{c.nameAr || c.nameEn}</p>
            <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.75rem' }}>{c.nameEn}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'slug', label: 'Slug',
      render: (c: Category) => <span className="font-mono text-xs" style={{ color: GOLD }}>{c.slug}</span>,
    },
    {
      key: 'productCount', label: 'المنتجات',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(210,181,106,.1)', color: GOLD }}>
          {c.productCount ?? 0}
        </span>
      ),
    },
    {
      key: 'status', label: 'الحالة',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{
          background: c.status === 'active' ? 'rgba(75,181,69,.15)' : 'rgba(168,84,58,.2)',
          color:      c.status === 'active' ? '#4ADE80'              : '#e07a5f',
          border: `1px solid ${c.status === 'active' ? 'rgba(75,181,69,.3)' : 'rgba(168,84,58,.3)'}`,
        }}>
          {c.status === 'active' ? 'نشط' : 'معطل'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (c: any) => {
        const catId = c.id || c._id;
        return (
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={() => openEdit(c)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(210,181,106,.1)', color: GOLD, border: `1px solid rgba(210,181,106,.2)` }}>
              تعديل
            </button>
            <button onClick={() => handleDelete(catId, c.nameAr || c.nameEn)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(239,68,68,.1)', color: '#F87171', border: '1px solid rgba(239,68,68,.2)' }}>
              حذف
            </button>
          </div>
        );
      },
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>
            إدارة الأقسام
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.4)' }}>
            {categories.length} أقسام متاحة
          </p>
        </div>
        <button onClick={openNew} className="text-sm font-semibold px-5 py-2.5 rounded-pill shadow-sm transition-all hover:opacity-90"
          style={{ background: GOLD, color: '#15130F' }}>
          + إضافة قسم جديد
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={CARD} className="flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            {editId ? 'تعديل القسم' : 'قسم جديد'}
          </p>

          {/* ── Image upload ─────────────────────────────────────────────────── */}
          <div>
            <p style={{ fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(247,244,236,.38)', marginBottom: '.6rem' }}>
              صورة القسم (اختياري)
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

              {/* Preview / placeholder */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 120, height: 120, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                  border: `2px dashed ${imagePreview ? GOLD : BORDER}`,
                  cursor: 'pointer', position: 'relative',
                  background: imagePreview ? 'transparent' : 'rgba(210,181,106,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 200ms',
                }}
              >
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '1.8rem', opacity: .4 }}>🖼</div>
                    <p style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.35)', marginTop: '.3rem' }}>
                      اختر صورة
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                  style={{
                    padding: '.5rem 1.2rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600,
                    background: 'rgba(210,181,106,.1)', color: GOLD,
                    border: `1px solid rgba(210,181,106,.25)`, cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {imagePreview ? '🔄 تغيير الصورة' : '📂 رفع صورة'}
                </button>
                {imagePreview && (
                  <button type="button" onClick={removeImage} style={{
                    padding: '.4rem 1.2rem', borderRadius: 999, fontSize: '.75rem',
                    background: 'rgba(239,68,68,.08)', color: '#F87171',
                    border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer',
                  }}>
                    🗑 حذف الصورة
                  </button>
                )}
                <p style={{ fontSize: '.65rem', color: 'rgba(247,244,236,.25)', lineHeight: 1.5 }}>
                  JPG أو PNG أو WebP<br />حجم أقصى 5 MB
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* ── Text fields ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput label="اسم القسم بالعربية *" value={form.nameAr}  onChange={set('nameAr')}  required dir="rtl" placeholder="مثال: استرخاء" />
            <AdminInput label="Name (English) *"      value={form.nameEn}  onChange={set('nameEn')}  required placeholder="e.g. Relax" />
            <AdminInput label="Slug (URL)"             value={form.slug}    onChange={set('slug')}    placeholder="e.g. relax" />
            <AdminSelect label="الحالة / Status"       value={form.status}  onChange={set('status')}>
              <option value="active">نشط — يظهر في المتجر</option>
              <option value="inactive">معطل — مخفي</option>
            </AdminSelect>
            <div className="sm:col-span-2">
              <AdminTextarea label="الوصف بالعربية" value={form.descriptionAr} onChange={set('descriptionAr')} rows={2} dir="rtl" />
            </div>
            <div className="sm:col-span-2">
              <AdminTextarea label="Description (English)" value={form.descriptionEn} onChange={set('descriptionEn')} rows={2} />
            </div>
          </div>

          {/* ── Action buttons ───────────────────────────────────────────────── */}
          <div className="flex gap-3 mt-1">
            <button type="submit" disabled={saving || uploadingImg}
              style={{
                padding: '.6rem 1.75rem', borderRadius: 999, fontSize: '.85rem', fontWeight: 700,
                background: GOLD, color: '#15130F', cursor: 'pointer',
                opacity: (saving || uploadingImg) ? .65 : 1, transition: 'opacity 200ms',
              }}>
              {uploadingImg ? '⬆ جاري رفع الصورة...' : saving ? 'جاري الحفظ...' : editId ? '💾 حفظ التعديلات' : '✓ إنشاء القسم'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetImage(); }}
              style={{ padding: '.6rem 1.5rem', borderRadius: 999, fontSize: '.85rem', border: `1px solid ${BORDER}`, color: 'rgba(247,244,236,.6)', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <AdminTable columns={columns} data={categories} loading={loading} keyField="id" emptyText="لا توجد أقسام بعد" />
    </div>
  );
}
