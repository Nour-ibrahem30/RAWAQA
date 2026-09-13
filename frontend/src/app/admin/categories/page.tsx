'use client';

import { useEffect, useState } from 'react';
import { categoriesApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import AdminTable from '@/components/admin/AdminTable';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/AdminInput';
import type { Category } from '@/lib/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    slug: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    categoriesApi.all('ar')
      .then(r => {
        const raw = r.data ?? [];
        const list = raw.map((c: any) => ({
          ...c,
          id: c.id || c._id,
        }));
        setCategories(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      slug: '',
      status: 'active',
    });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    const id = c.id || c._id;
    setForm({
      nameEn: c.nameEn || '',
      nameAr: c.nameAr || '',
      descriptionEn: c.descriptionEn || '',
      descriptionAr: c.descriptionAr || '',
      slug: c.slug || c.slugEn || c.slugAr || '',
      status: c.status || (c.isActive === false ? 'inactive' : 'active'),
    });
    setEditId(id);
    setShowForm(true);
  };

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      showToast('Please enter both Arabic and English names / يرجى إدخال اسم القسم بالعربية والإنجليزية', 'error');
      return;
    }

    setSaving(true);
    try {
      const cleanSlug = form.slug.trim().toLowerCase() ||
        form.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        descriptionAr: form.descriptionAr.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
        slug: cleanSlug,
        slugAr: cleanSlug,
        slugEn: cleanSlug,
        status: form.status,
        isActive: form.status === 'active',
      };

      if (editId) {
        await categoriesApi.update(editId, payload);
        showToast('Category updated successfully! / تم تحديث القسم بنجاح', 'success');
      } else {
        await categoriesApi.create(payload);
        showToast('Category created successfully! / تم إنشاء القسم بنجاح', 'success');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? / هل أنت متأكد من حذف قسم "${name}"؟`)) return;
    try {
      await categoriesApi.delete(id);
      showToast('Category deleted / تم حذف القسم', 'success');
      load();
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to delete category', 'error');
    }
  };

  const CARD = {
    background: '#15130F',
    border: '1px solid rgba(210,181,106,.15)',
    borderRadius: 20,
    padding: 24,
  };

  const columns = [
    {
      key: 'nameEn', label: 'Category / القسم',
      render: (c: Category) => (
        <div>
          <p style={{ color: '#F7F4EC', fontWeight: 600 }}>{c.nameAr || c.nameEn}</p>
          <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.75rem' }}>{c.nameEn}</p>
        </div>
      ),
    },
    {
      key: 'slug', label: 'Slug / الرابط',
      render: (c: Category) => <span className="font-mono text-xs" style={{ color: '#D2B56A' }}>{c.slug}</span>,
    },
    {
      key: 'productCount', label: 'Products / المنتجات',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(210,181,106,.1)', color: '#D2B56A' }}>
          {c.productCount ?? 0} منتج
        </span>
      ),
    },
    {
      key: 'status', label: 'Status / الحالة',
      render: (c: Category) => (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{
          background: c.status === 'active' ? 'rgba(75,181,69,.15)' : 'rgba(168,84,58,.2)',
          color: c.status === 'active' ? '#4ADE80' : '#e07a5f',
          border: `1px solid ${c.status === 'active' ? 'rgba(75,181,69,.3)' : 'rgba(168,84,58,.3)'}`,
        }}>
          {c.status === 'active' ? 'نشط / Active' : 'معطل / Inactive'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (c: any) => {
        const catId = c.id || c._id;
        return (
          <div className="flex gap-2 items-center justify-end">
            <button
              onClick={() => openEdit(c)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(210,181,106,.1)', color: '#D2B56A', border: '1px solid rgba(210,181,106,.2)' }}
            >
              تعديل / Edit
            </button>
            <button
              onClick={() => handleDelete(catId, c.nameAr || c.nameEn)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(239,68,68,.1)', color: '#F87171', border: '1px solid rgba(239,68,68,.2)' }}
            >
              حذف / Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>
            Categories / إدارة الأقسام
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.4)' }}>
            {categories.length} أقسام متاحة في المتجر
          </p>
        </div>
        <button
          onClick={openNew}
          className="text-sm font-semibold px-5 py-2.5 rounded-pill shadow-sm transition-all hover:opacity-90"
          style={{ background: '#D2B56A', color: '#15130F' }}
        >
          + Add Category / إضافة قسم جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={CARD} className="flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: '#D2B56A' }}>
            {editId ? 'Edit Category / تعديل القسم' : 'New Category / قسم جديد'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput
              label="Name (Arabic) / اسم القسم بالعربية *"
              value={form.nameAr}
              onChange={set('nameAr')}
              required
              dir="rtl"
              placeholder="مثال: استرخاء"
            />
            <AdminInput
              label="Name (English) / اسم القسم بالإنجليزية *"
              value={form.nameEn}
              onChange={set('nameEn')}
              required
              placeholder="e.g. Relax"
            />
            <AdminInput
              label="Slug (URL identifier) / معرف الرابط *"
              value={form.slug}
              onChange={set('slug')}
              placeholder="e.g. relax"
            />
            <AdminSelect
              label="Status / الحالة"
              value={form.status}
              onChange={set('status')}
            >
              <option value="active">Active / نشط (يظهر في المتجر)</option>
              <option value="inactive">Inactive / معطل (مخفي)</option>
            </AdminSelect>
            <div className="sm:col-span-2">
              <AdminTextarea
                label="Description (Arabic) / الوصف بالعربية"
                value={form.descriptionAr}
                onChange={set('descriptionAr')}
                rows={2}
                dir="rtl"
              />
            </div>
            <div className="sm:col-span-2">
              <AdminTextarea
                label="Description (English) / الوصف بالإنجليزية"
                value={form.descriptionEn}
                onChange={set('descriptionEn')}
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-semibold px-5 py-2.5 rounded-pill transition-all"
              style={{ background: '#D2B56A', color: '#15130F', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : editId ? 'Update / حفظ التعديلات' : 'Create / إنشاء القسم'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm px-5 py-2.5 rounded-pill transition-all"
              style={{ border: '1px solid rgba(210,181,106,.2)', color: 'rgba(247,244,236,.6)' }}
            >
              Cancel / إلغاء
            </button>
          </div>
        </form>
      )}

      <AdminTable columns={columns} data={categories} loading={loading} keyField="id" emptyText="No categories found" />
    </div>
  );
}
