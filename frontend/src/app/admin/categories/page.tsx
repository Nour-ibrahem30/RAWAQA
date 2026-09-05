'use client';

import { useEffect, useState } from 'react';
import { categoriesApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import AdminTable from '@/components/admin/AdminTable';
import { AdminInput, AdminTextarea } from '@/components/admin/AdminInput';
import type { Category } from '@/lib/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', slug: '' });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    categoriesApi.all('en').then(r => setCategories(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', slug: '' }); setEditId(null); setShowForm(true); };
  const openEdit = (c: Category) => { setForm({ nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn || '', descriptionAr: c.descriptionAr || '', slug: c.slug }); setEditId(c.id); setShowForm(true); };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await categoriesApi.update(editId, form);
        showToast('Category updated!', 'success');
      } else {
        await categoriesApi.create(form);
        showToast('Category created!', 'success');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) { showToast((err as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await categoriesApi.delete(id); showToast('Deleted', 'success'); load(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const CARD = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16, padding: 24 };

  const columns = [
    { key: 'nameEn', label: 'Name (EN)', render: (c: Category) => <div><p style={{ color: '#F7F4EC' }}>{c.nameEn}</p><p style={{ color: 'rgba(247,244,236,.35)', fontSize: '.7rem' }}>{c.nameAr}</p></div> },
    { key: 'slug', label: 'Slug', render: (c: Category) => <span className="font-mono text-xs" style={{ color: '#D2B56A' }}>{c.slug}</span> },
    { key: 'productCount', label: 'Products', render: (c: Category) => c.productCount ?? '—' },
    { key: 'status', label: 'Status', render: (c: Category) => <span className="text-xs px-2 py-0.5 rounded-pill" style={{ background: c.status === 'active' ? 'rgba(75,91,69,.3)' : 'rgba(168,84,58,.2)', color: c.status === 'active' ? '#a3c49a' : '#e07a5f' }}>{c.status}</span> },
    { key: 'actions', label: 'Actions', render: (c: Category) => (
      <div className="flex gap-3">
        <button onClick={() => openEdit(c)} className="text-xs hover:underline" style={{ color: '#D2B56A' }}>Edit</button>
        <button onClick={() => handleDelete(c.id, c.nameEn)} className="text-xs hover:underline" style={{ color: '#A8543A' }}>Delete</button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>Categories</h1>
        <button onClick={openNew} className="text-sm font-semibold px-5 py-2.5 rounded-pill" style={{ background: '#D2B56A', color: '#15130F' }}>+ Add Category</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={CARD} className="flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: '#D2B56A' }}>{editId ? 'Edit Category' : 'New Category'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput label="Name (English) *" value={form.nameEn} onChange={set('nameEn')} required />
            <AdminInput label="Name (Arabic) *" value={form.nameAr} onChange={set('nameAr')} required dir="rtl" />
            <AdminInput label="Slug *" value={form.slug} onChange={set('slug')} required placeholder="relax" />
            <div />
            <AdminTextarea label="Description (EN)" value={form.descriptionEn} onChange={set('descriptionEn')} rows={2} />
            <AdminTextarea label="Description (AR)" value={form.descriptionAr} onChange={set('descriptionAr')} rows={2} dir="rtl" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="text-sm font-semibold px-5 py-2.5 rounded-pill" style={{ background: '#D2B56A', color: '#15130F', opacity: saving ? .6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm px-5 py-2.5 rounded-pill" style={{ border: '1px solid rgba(210,181,106,.2)', color: 'rgba(247,244,236,.6)' }}>Cancel</button>
          </div>
        </form>
      )}

      <AdminTable columns={columns} data={categories} loading={loading} keyField="id" emptyText="No categories" />
    </div>
  );
}
