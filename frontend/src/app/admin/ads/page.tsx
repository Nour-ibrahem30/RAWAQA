'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adsApi, type Ad } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const CARD  = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16 };
const GOLD  = '#D2B56A';
const IVORY = '#F7F4EC';
const DIM   = 'rgba(247,244,236,.4)';

const PLACEMENTS = [
  { value: 'homepage_banner', label: 'Homepage — Main Banner' },
  { value: 'homepage_mid',    label: 'Homepage — Mid Section' },
  { value: 'shop_sidebar',    label: 'Shop — Sidebar' },
  { value: 'product_page',    label: 'Product Page' },
];

const PLACEMENT_BADGE: Record<string, { bg: string; color: string }> = {
  homepage_banner: { bg: 'rgba(210,181,106,.15)', color: GOLD },
  homepage_mid:    { bg: 'rgba(75,91,69,.25)',    color: '#9bc48a' },
  shop_sidebar:    { bg: 'rgba(59,85,120,.25)',   color: '#7aaee8' },
  product_page:    { bg: 'rgba(168,84,58,.2)',    color: '#e09070' },
};

const STATIC_ADS: Ad[] = [
  {
    _id: 'static-1', titleAr: 'بين باج رواقة', titleEn: 'Rawaqa Bean Bags',
    subtitleAr: 'راحة حقيقية في كل مكان', subtitleEn: 'Real comfort everywhere',
    imageUrl: '/products/ads/ad-1.jpg', placement: 'homepage_banner',
    isActive: true, order: 0, createdAt: new Date().toISOString(),
  },
  {
    _id: 'static-2', titleAr: 'مجموعة جديدة', titleEn: 'New Collection',
    subtitleAr: 'اكتشف أحدث تصاميمنا', subtitleEn: 'Discover our latest designs',
    imageUrl: '/products/ads/ad-2.jpg', placement: 'homepage_mid',
    isActive: true, order: 1, createdAt: new Date().toISOString(),
  },
];

const emptyForm = (): Partial<Ad> => ({
  titleAr: '', titleEn: '', subtitleAr: '', subtitleEn: '',
  imageUrl: '', linkUrl: '', placement: 'homepage_banner',
  isActive: true, order: 0,
});

export default function AdminAdsPage() {
  const { showToast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Ad>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [preview, setPreview] = useState<Ad | null>(null);
  const [filterPlacement, setFilterPlacement] = useState<string>('all');

  useEffect(() => {
    adsApi.adminList()
      .then(r => setAds(r.data ?? []))
      .catch(() => setAds(STATIC_ADS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterPlacement === 'all' ? ads : ads.filter(a => a.placement === filterPlacement);

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
  const openEdit = (ad: Ad) => {
    setForm({
      titleAr: ad.titleAr, titleEn: ad.titleEn,
      subtitleAr: ad.subtitleAr || '', subtitleEn: ad.subtitleEn || '',
      imageUrl: ad.imageUrl, linkUrl: ad.linkUrl || '',
      placement: ad.placement, isActive: ad.isActive,
      order: ad.order,
      startDate: ad.startDate, endDate: ad.endDate,
    });
    setEditId(ad._id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleAr || !form.titleEn || !form.imageUrl) {
      showToast('Please fill title (AR + EN) and image URL', 'error'); return;
    }
    setSaving(true);
    try {
      if (editId) {
        const r = await adsApi.update(editId, form);
        setAds(prev => prev.map(a => a._id === editId ? r.data : a));
        showToast('Ad updated', 'success');
      } else {
        const r = await adsApi.create(form);
        setAds(prev => [...prev, r.data]);
        showToast('Ad created', 'success');
      }
      setShowForm(false); setEditId(null); setForm(emptyForm());
    } catch (err: unknown) {
      showToast((err as Error).message || 'Error saving ad', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const r = await adsApi.toggle(id);
      setAds(prev => prev.map(a => a._id === id ? { ...a, isActive: r.data.isActive } : a));
    } catch {
      showToast('Failed to toggle ad', 'error');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await adsApi.delete(id);
      setAds(prev => prev.filter(a => a._id !== id));
      showToast('Ad deleted', 'success');
    } catch {
      showToast('Failed to delete ad', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const setF = (key: keyof Ad, val: any) => setForm(f => ({ ...f, [key]: val }));

  const InputStyle = {
    width: '100%', background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(210,181,106,.12)', borderRadius: 10,
    padding: '.65rem .9rem', fontSize: '.85rem', color: IVORY,
    outline: 'none', fontFamily: 'inherit',
  };
  const LabelStyle = {
    display: 'block', fontSize: '.62rem', letterSpacing: '.1em',
    textTransform: 'uppercase' as const, color: DIM, marginBottom: '.35rem',
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-fraunces, serif)', color: IVORY }}>
            Ads Management
          </h1>
          <p style={{ color: DIM, fontSize: '.82rem', marginTop: '.25rem' }}>
            Manage promotional banners and ads displayed across the site
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-gold btn-sm" style={{ flexShrink: 0 }}>
          + New Ad
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(210,181,106,.1)', overflowX: 'auto' }}>
        {[{ value: 'all', label: 'All' }, ...PLACEMENTS].map(p => (
          <button key={p.value} onClick={() => setFilterPlacement(p.value)}
            style={{
              padding: '.5rem 1rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', whiteSpace: 'nowrap',
              color: filterPlacement === p.value ? GOLD : DIM,
              borderBottom: `2px solid ${filterPlacement === p.value ? GOLD : 'transparent'}`,
              marginBottom: -1, transition: 'all 200ms ease',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Ads grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {[1, 2].map(i => <div key={i} style={{ ...CARD, height: 220, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...CARD, padding: '4rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📢</p>
          <p style={{ color: IVORY, fontWeight: 600 }}>No ads yet</p>
          <p style={{ color: DIM, fontSize: '.82rem', marginTop: '.4rem' }}>Create your first ad to start promoting products</p>
          <button onClick={openCreate} className="btn btn-gold btn-sm" style={{ marginTop: '1.5rem' }}>
            + Create First Ad
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(ad => {
            const badge = PLACEMENT_BADGE[ad.placement] || PLACEMENT_BADGE.homepage_banner;
            return (
              <div key={ad._id} style={{ ...CARD, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ position: 'relative', aspectRatio: '16/7', background: '#1a1710', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setPreview(ad)}>
                  <Image
                    src={ad.imageUrl} alt={ad.titleEn} fill
                    style={{ objectFit: 'cover', transition: 'transform 400ms ease' }}
                    sizes="350px"
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  {/* Overlay text preview */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 55%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1rem' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '.9rem', lineHeight: 1.3 }}>{ad.titleAr}</p>
                    {ad.subtitleAr && <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '.75rem', marginTop: '.2rem' }}>{ad.subtitleAr}</p>}
                  </div>
                  {/* Active/Inactive badge */}
                  <div style={{ position: 'absolute', top: '.75rem', right: '.75rem', background: ad.isActive ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.15)', border: `1px solid ${ad.isActive ? 'rgba(74,222,128,.4)' : 'rgba(248,113,113,.3)'}`, borderRadius: 999, padding: '.2rem .6rem', fontSize: '.62rem', fontWeight: 700, color: ad.isActive ? '#4ade80' : '#f87171' }}>
                    {ad.isActive ? '● Active' : '○ Inactive'}
                  </div>
                  {/* Preview icon */}
                  <div style={{ position: 'absolute', top: '.75rem', left: '.75rem', background: 'rgba(0,0,0,.5)', borderRadius: 8, padding: '.3rem .5rem', fontSize: '.65rem', color: 'rgba(255,255,255,.7)' }}>
                    🔍 Preview
                  </div>
                </div>

                {/* Meta */}
                <div style={{ padding: '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, background: badge.bg, color: badge.color, padding: '.2rem .6rem', borderRadius: 999 }}>
                      {PLACEMENTS.find(p => p.value === ad.placement)?.label || ad.placement}
                    </span>
                    <span style={{ fontSize: '.68rem', color: DIM }}>Order: {ad.order}</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '.875rem', color: IVORY, lineHeight: 1.3 }}>{ad.titleEn}</p>
                  {ad.linkUrl && (
                    <p style={{ fontSize: '.72rem', color: GOLD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🔗 {ad.linkUrl}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '.75rem 1.1rem', borderTop: '1px solid rgba(210,181,106,.08)', display: 'flex', gap: '.5rem' }}>
                  <button onClick={() => openEdit(ad)}
                    style={{ flex: 1, background: 'rgba(210,181,106,.08)', border: '1px solid rgba(210,181,106,.15)', borderRadius: 8, padding: '.4rem .7rem', cursor: 'pointer', color: GOLD, fontSize: '.75rem', fontWeight: 600, transition: 'background 200ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(210,181,106,.18)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(210,181,106,.08)')}>
                    ✎ Edit
                  </button>
                  <button onClick={() => handleToggle(ad._id)} disabled={toggling === ad._id}
                    style={{ flex: 1, background: ad.isActive ? 'rgba(248,113,113,.08)' : 'rgba(74,222,128,.08)', border: `1px solid ${ad.isActive ? 'rgba(248,113,113,.2)' : 'rgba(74,222,128,.2)'}`, borderRadius: 8, padding: '.4rem .7rem', cursor: 'pointer', color: ad.isActive ? '#f87171' : '#4ade80', fontSize: '.75rem', fontWeight: 600 }}>
                    {toggling === ad._id ? '...' : (ad.isActive ? '⏸ Pause' : '▶ Activate')}
                  </button>
                  <button onClick={() => handleDelete(ad._id)} disabled={deleting === ad._id}
                    style={{ background: 'none', border: '1px solid rgba(248,113,113,.15)', borderRadius: 8, padding: '.4rem .65rem', cursor: 'pointer', color: 'rgba(248,113,113,.6)', fontSize: '.75rem', transition: 'all 200ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,.1)'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(248,113,113,.6)'; }}>
                    {deleting === ad._id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); } }}>
          <div style={{ background: '#15130F', border: '1px solid rgba(210,181,106,.15)', borderRadius: 24, padding: 'clamp(1.5rem,4vw,2.25rem)', maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

            {/* Top shimmer */}
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(210,181,106,.4), transparent)' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1.25rem', color: IVORY }}>
                {editId ? 'Edit Ad' : 'New Ad'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Image URL */}
              <div>
                <label style={LabelStyle}>Image URL *</label>
                <input value={form.imageUrl || ''} onChange={e => setF('imageUrl', e.target.value)}
                  required placeholder="/products/ads/ad-1.jpg or https://..." style={InputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                {form.imageUrl && (
                  <div style={{ marginTop: '.5rem', borderRadius: 10, overflow: 'hidden', height: 80, position: 'relative', background: '#0f0e0a' }}>
                    <Image src={form.imageUrl} alt="preview" fill style={{ objectFit: 'cover' }} sizes="500px" onError={() => {}} />
                  </div>
                )}
              </div>

              {/* Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={LabelStyle}>Title (عربي) *</label>
                  <input value={form.titleAr || ''} onChange={e => setF('titleAr', e.target.value)}
                    required dir="rtl" placeholder="عنوان الإعلان" style={InputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
                <div>
                  <label style={LabelStyle}>Title (English) *</label>
                  <input value={form.titleEn || ''} onChange={e => setF('titleEn', e.target.value)}
                    required placeholder="Ad Title" style={InputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
              </div>

              {/* Subtitles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={LabelStyle}>Subtitle (عربي)</label>
                  <input value={form.subtitleAr || ''} onChange={e => setF('subtitleAr', e.target.value)}
                    dir="rtl" placeholder="عنوان فرعي" style={InputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
                <div>
                  <label style={LabelStyle}>Subtitle (English)</label>
                  <input value={form.subtitleEn || ''} onChange={e => setF('subtitleEn', e.target.value)}
                    placeholder="Optional subtitle" style={InputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label style={LabelStyle}>Link URL (on click)</label>
                <input value={form.linkUrl || ''} onChange={e => setF('linkUrl', e.target.value)}
                  placeholder="/ar/shop or https://..." style={InputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
              </div>

              {/* Placement + Order + Active */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={LabelStyle}>Placement</label>
                  <select value={form.placement} onChange={e => setF('placement', e.target.value)}
                    style={{ ...InputStyle, cursor: 'pointer' }}>
                    {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LabelStyle}>Order</label>
                  <input type="number" value={form.order ?? 0} onChange={e => setF('order', parseInt(e.target.value) || 0)}
                    min={0} style={InputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
                <div>
                  <label style={LabelStyle}>Status</label>
                  <select value={form.isActive ? 'active' : 'inactive'} onChange={e => setF('isActive', e.target.value === 'active')}
                    style={{ ...InputStyle, cursor: 'pointer', color: form.isActive ? '#4ade80' : '#f87171' }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Date range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={LabelStyle}>Start Date (optional)</label>
                  <input type="date" value={form.startDate ? form.startDate.slice(0, 10) : ''}
                    onChange={e => setF('startDate', e.target.value || undefined)}
                    style={{ ...InputStyle, colorScheme: 'dark' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
                <div>
                  <label style={LabelStyle}>End Date (optional)</label>
                  <input type="date" value={form.endDate ? form.endDate.slice(0, 10) : ''}
                    onChange={e => setF('endDate', e.target.value || undefined)}
                    style={{ ...InputStyle, colorScheme: 'dark' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '.75rem', paddingTop: '.5rem' }}>
                <button type="submit" disabled={saving} className="btn btn-gold" style={{ flex: 1 }}>
                  {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Create Ad')}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, background: 'none', border: '1px solid rgba(210,181,106,.15)', borderRadius: 12, color: DIM, cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Full Preview Modal ──────────────────────────────────── */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setPreview(null)}>
          <div style={{ maxWidth: 800, width: '100%', position: 'relative', borderRadius: 20, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', aspectRatio: '16/7' }}>
              <Image src={preview.imageUrl} alt={preview.titleEn} fill style={{ objectFit: 'cover' }} sizes="800px" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem' }}>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', lineHeight: 1.2 }}>{preview.titleAr}</p>
                {preview.subtitleAr && <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 'clamp(.8rem, 1.5vw, 1rem)', marginTop: '.4rem' }}>{preview.subtitleAr}</p>}
              </div>
            </div>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
