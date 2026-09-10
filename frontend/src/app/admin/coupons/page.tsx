'use client';

import { useEffect, useState, useMemo } from 'react';
import { couponsApi, type Coupon } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const CARD  = { background: '#15130F', border: '1px solid rgba(210,181,106,.12)', borderRadius: 16 };
const GOLD  = '#D2B56A';
const IVORY = '#F7F4EC';
const DIM   = 'rgba(247,244,236,.45)';

interface CouponFormData {
  code: string;
  type: 'percentage' | 'fixed';
  value: number | '';
  minOrderValue: number | '';
  maxDiscount: number | '';
  usageLimit: number | '';
  perUserLimit: number | '';
  expiresAt: string;
  isActive: boolean;
}

const emptyForm = (): CouponFormData => ({
  code: '',
  type: 'percentage',
  value: '',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: 1,
  expiresAt: '',
  isActive: true,
});

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const fetchCoupons = async () => {
    try {
      const res = await couponsApi.list();
      setCoupons(res.data || []);
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to fetch coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length;
    const inactive = total - active;
    const totalUses = coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0);
    return { total, active, inactive, totalUses };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = c.code.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      const isExpired = c.expiresAt && new Date(c.expiresAt) <= new Date();
      if (filter === 'active') return c.isActive && !isExpired;
      if (filter === 'inactive') return !c.isActive || isExpired;
      return true;
    });
  }, [coupons, filter, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrderValue: c.minOrderValue || '',
      maxDiscount: c.maxDiscount || '',
      usageLimit: c.usageLimit || '',
      perUserLimit: c.perUserLimit || 1,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '',
      isActive: c.isActive,
    });
    setEditId(c._id);
    setShowModal(true);
  };

  const handleToggle = async (c: Coupon) => {
    const nextState = !c.isActive;
    setTogglingId(c._id);
    try {
      await couponsApi.toggle(c._id, nextState);
      setCoupons(prev => prev.map(item => item._id === c._id ? { ...item, isActive: nextState } : item));
      showToast(nextState ? `تم تفعيل الكوبون ${c.code}` : `تم تعطيل الكوبون ${c.code}`, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'تعذر تعديل حالة الكوبون', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`هل أنت متأكد من رغبتك في تعطيل الكوبون "${c.code}"؟`)) return;
    try {
      await couponsApi.delete(c._id);
      setCoupons(prev => prev.map(item => item._id === c._id ? { ...item, isActive: false } : item));
      showToast(`تم تعطيل الكوبون ${c.code}`, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'تعذر حذف الكوبون', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showToast('يرجى كتابة رمز الكوبون', 'error');
      return;
    }
    if (form.value === '' || Number(form.value) <= 0) {
      showToast('يرجى تحديد قيمة صالحة للخصم', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Coupon> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        maxDiscount: form.type === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : 1,
        isActive: form.isActive,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      };

      if (editId) {
        const res = await couponsApi.update(editId, payload);
        setCoupons(prev => prev.map(c => c._id === editId ? res.data : c));
        showToast('تم تحديث الكوبون بنجاح', 'success');
      } else {
        const res = await couponsApi.create(payload);
        setCoupons(prev => [res.data, ...prev]);
        showToast('تم إنشاء الكوبون الجديد بنجاح', 'success');
      }
      setShowModal(false);
      setEditId(null);
      setForm(emptyForm());
    } catch (err: unknown) {
      showToast((err as Error).message || 'فشلت عملية حفظ الكوبون', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`تم نسخ الكوبون "${code}"`, 'info');
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: IVORY, letterSpacing: '.02em' }}>
            إدارة الكوبونات والعروض
          </h1>
          <p style={{ fontSize: '.85rem', color: DIM, marginTop: 4 }}>
            إنشاء أكواد الخصم وتفعيلها أو إيقافها، وتحديد شروط الحد الأدنى وحدود الاستخدام.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn btn-gold"
          style={{ padding: '.65rem 1.4rem', fontSize: '.85rem', fontWeight: 700, borderRadius: 12 }}
        >
          + إضافة كوبون جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div style={{ ...CARD, padding: '1.25rem' }}>
          <p style={{ fontSize: '.75rem', color: DIM, marginBottom: 6 }}>إجمالي الكوبونات</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: IVORY }}>{stats.total}</p>
        </div>
        <div style={{ ...CARD, padding: '1.25rem', borderColor: 'rgba(74,222,128,.2)' }}>
          <p style={{ fontSize: '.75rem', color: '#86efac', marginBottom: 6 }}>كوبونات نشطة</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>{stats.active}</p>
        </div>
        <div style={{ ...CARD, padding: '1.25rem', borderColor: 'rgba(248,113,113,.2)' }}>
          <p style={{ fontSize: '.75rem', color: '#fca5a5', marginBottom: 6 }}>معطلة / منتهية</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171' }}>{stats.inactive}</p>
        </div>
        <div style={{ ...CARD, padding: '1.25rem', borderColor: 'rgba(210,181,106,.25)' }}>
          <p style={{ fontSize: '.75rem', color: GOLD, marginBottom: 6 }}>مرات الاستخدام الإجمالية</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: GOLD }}>{stats.totalUses}</p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 p-3 rounded-2xl"
        style={{ background: '#191612', border: '1px solid rgba(210,181,106,.1)' }}
      >
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '.45rem 1rem',
                borderRadius: 10,
                fontSize: '.8rem',
                fontWeight: 600,
                background: filter === tab ? 'rgba(210,181,106,.18)' : 'transparent',
                color: filter === tab ? GOLD : DIM,
                border: filter === tab ? '1px solid rgba(210,181,106,.3)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {tab === 'all' ? 'الكل' : tab === 'active' ? 'النشطة فقط' : 'المعطلة'}
            </button>
          ))}
        </div>

        <div style={{ minWidth: 240 }}>
          <input
            type="text"
            placeholder="بحث برمز الكوبون..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(210,181,106,.12)',
              borderRadius: 10,
              padding: '.45rem .85rem',
              fontSize: '.82rem',
              color: IVORY,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Coupons Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <p style={{ color: DIM, fontSize: '.9rem' }}>جاري تحميل الكوبونات...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div style={{ ...CARD, padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏷️</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: IVORY, marginBottom: '.5rem' }}>
            لا توجد كوبونات مطابقة
          </h3>
          <p style={{ fontSize: '.82rem', color: DIM, marginBottom: '1.5rem' }}>
            قم بإنشاء كود خصم جديد لعملائك لزيادة المبيعات والعروض الترويجية.
          </p>
          <button onClick={openCreate} className="btn btn-gold btn-sm">
            + إنشاء أول كوبون
          </button>
        </div>
      ) : (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(210,181,106,.05)', borderBottom: '1px solid rgba(210,181,106,.1)' }}>
                  <th style={{ padding: '1rem 1.25rem', color: GOLD, fontWeight: 700 }}>كود الخصم</th>
                  <th style={{ padding: '1rem', color: GOLD, fontWeight: 700 }}>قيمة الخصم</th>
                  <th style={{ padding: '1rem', color: GOLD, fontWeight: 700 }}>الشروط والحد الأدنى</th>
                  <th style={{ padding: '1rem', color: GOLD, fontWeight: 700 }}>الاستخدام</th>
                  <th style={{ padding: '1rem', color: GOLD, fontWeight: 700 }}>الصلاحية</th>
                  <th style={{ padding: '1rem', color: GOLD, fontWeight: 700 }}>الحالة والتفعيل</th>
                  <th style={{ padding: '1rem 1.25rem', color: GOLD, fontWeight: 700 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map(c => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) <= new Date();
                  const isLimitReached = c.usageLimit && c.usageLimit > 0 && c.usedCount >= c.usageLimit;
                  const effectivelyActive = c.isActive && !isExpired && !isLimitReached;

                  return (
                    <tr
                      key={c._id}
                      style={{
                        borderBottom: '1px solid rgba(210,181,106,.07)',
                        transition: 'background 150ms ease',
                      }}
                      className="hover:bg-white/[0.02]"
                    >
                      {/* Code */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => copyCode(c.code)}
                            title="انقر للنسخ"
                            style={{
                              background: 'rgba(210,181,106,.12)',
                              border: '1px dashed rgba(210,181,106,.35)',
                              color: GOLD,
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '.95rem',
                              padding: '.3rem .65rem',
                              borderRadius: 8,
                              cursor: 'pointer',
                              letterSpacing: '.08em',
                            }}
                          >
                            {c.code}
                          </span>
                        </div>
                      </td>

                      {/* Value */}
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 700, color: IVORY, fontSize: '.95rem' }}>
                          {c.type === 'percentage' ? `${c.value}%` : `${c.value} ج.م`}
                        </span>
                        <span style={{ display: 'block', fontSize: '.72rem', color: DIM }}>
                          {c.type === 'percentage' ? 'خصم مئوي' : 'خصم مبلغ ثابت'}
                        </span>
                      </td>

                      {/* Conditions */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '.78rem', color: 'rgba(247,244,236,.8)' }}>
                          {c.minOrderValue && c.minOrderValue > 0 ? (
                            <p>أدنى طلب: <strong>{c.minOrderValue} ج.م</strong></p>
                          ) : (
                            <p style={{ color: DIM }}>بدون حد أدنى للطلب</p>
                          )}
                          {c.type === 'percentage' && c.maxDiscount && c.maxDiscount > 0 ? (
                            <p style={{ color: GOLD, fontSize: '.72rem' }}>حد أقصى: {c.maxDiscount} ج.م</p>
                          ) : null}
                        </div>
                      </td>

                      {/* Usage */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '.8rem' }}>
                          <span style={{ fontWeight: 700, color: c.usedCount > 0 ? GOLD : IVORY }}>
                            {c.usedCount || 0}
                          </span>
                          <span style={{ color: DIM }}> / {c.usageLimit && c.usageLimit > 0 ? c.usageLimit : '∞'}</span>
                          {isLimitReached && (
                            <span style={{ display: 'block', color: '#f87171', fontSize: '.7rem' }}>
                              اكتمل الحد الأقصى
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td style={{ padding: '1rem' }}>
                        {c.expiresAt ? (
                          <div>
                            <span style={{ fontSize: '.78rem', color: isExpired ? '#f87171' : IVORY }}>
                              {new Date(c.expiresAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            {isExpired && (
                              <span style={{ display: 'block', fontSize: '.7rem', color: '#f87171', fontWeight: 700 }}>
                                منتهي الصلاحية
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '.78rem', color: DIM }}>دائم (بدون انتهاء)</span>
                        )}
                      </td>

                      {/* Status / Toggle */}
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => handleToggle(c)}
                          disabled={togglingId === c._id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '.45rem',
                            padding: '.35rem .75rem',
                            borderRadius: 20,
                            fontSize: '.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                            background: effectivelyActive ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)',
                            color: effectivelyActive ? '#4ade80' : '#f87171',
                            border: `1px solid ${effectivelyActive ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: effectivelyActive ? '#4ade80' : '#f87171',
                              boxShadow: effectivelyActive ? '0 0 6px #4ade80' : 'none',
                            }}
                          />
                          {togglingId === c._id ? 'جاري التحديث...' : effectivelyActive ? 'متاح ومفعل' : 'غير متاح (معطل)'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            title="تعديل الكوبون"
                            style={{
                              background: 'rgba(255,255,255,.05)',
                              border: '1px solid rgba(210,181,106,.15)',
                              color: IVORY,
                              borderRadius: 8,
                              padding: '.3rem .6rem',
                              fontSize: '.75rem',
                              cursor: 'pointer',
                            }}
                            className="hover:border-gold hover:text-gold transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            title="تعطيل الكوبون"
                            style={{
                              background: 'rgba(248,113,113,.08)',
                              border: '1px solid rgba(248,113,113,.2)',
                              color: '#fca5a5',
                              borderRadius: 8,
                              padding: '.3rem .6rem',
                              fontSize: '.75rem',
                              cursor: 'pointer',
                            }}
                            className="hover:bg-red-500/20 transition-colors"
                          >
                            تعطيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#161410',
              border: '1px solid rgba(210,181,106,.25)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,.8)',
            }}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D2B56A]/15">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: IVORY }}>
                {editId ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: DIM, fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-right">
              {/* Code */}
              <div>
                <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                  كود الخصم (مثال: RAWAQA20, VIP50) *
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="CODE20"
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(210,181,106,.2)',
                    borderRadius: 10,
                    padding: '.65rem .85rem',
                    fontSize: '.9rem',
                    color: GOLD,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    letterSpacing: '.08em',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                    نوع الخصم *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    style={{
                      width: '100%',
                      background: '#1f1c16',
                      border: '1px solid rgba(210,181,106,.2)',
                      borderRadius: 10,
                      padding: '.65rem .85rem',
                      fontSize: '.85rem',
                      color: IVORY,
                      outline: 'none',
                    }}
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                    قيمة الخصم {form.type === 'percentage' ? '(%)' : '(ج.م)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value ? Number(e.target.value) : '' }))}
                    placeholder={form.type === 'percentage' ? '20' : '100'}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(210,181,106,.2)',
                      borderRadius: 10,
                      padding: '.65rem .85rem',
                      fontSize: '.85rem',
                      color: IVORY,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                    الحد الأدنى للطلب (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderValue}
                    onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value ? Number(e.target.value) : '' }))}
                    placeholder="0 = بدون حد"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(210,181,106,.2)',
                      borderRadius: 10,
                      padding: '.65rem .85rem',
                      fontSize: '.85rem',
                      color: IVORY,
                      outline: 'none',
                    }}
                  />
                </div>

                {form.type === 'percentage' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                      الحد الأقصى للخصم (ج.م)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.maxDiscount}
                      onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value ? Number(e.target.value) : '' }))}
                      placeholder="0 = بدون سقف"
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,.05)',
                        border: '1px solid rgba(210,181,106,.2)',
                        borderRadius: 10,
                        padding: '.65rem .85rem',
                        fontSize: '.85rem',
                        color: IVORY,
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Usage Limit & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                    الحد الإجمالي للاستخدام
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.usageLimit}
                    onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : '' }))}
                    placeholder="0 = غير محدود"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.05)',
                      border: '1px solid rgba(210,181,106,.2)',
                      borderRadius: 10,
                      padding: '.65rem .85rem',
                      fontSize: '.85rem',
                      color: IVORY,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.75rem', color: DIM, marginBottom: '.35rem' }}>
                    تاريخ انتهاء الصلاحية
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#1f1c16',
                      border: '1px solid rgba(210,181,106,.2)',
                      borderRadius: 10,
                      padding: '.65rem .85rem',
                      fontSize: '.85rem',
                      color: IVORY,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    style={{ accentColor: GOLD, width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: '.85rem', color: IVORY, fontWeight: 600 }}>
                    الكوبون نشط ومتاح للاستخدام فوراً
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#D2B56A]/15">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(210,181,106,.2)',
                    borderRadius: 10,
                    padding: '.65rem 1.25rem',
                    fontSize: '.85rem',
                    color: DIM,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-gold"
                  style={{ padding: '.65rem 1.75rem', fontSize: '.85rem', fontWeight: 700, borderRadius: 10 }}
                >
                  {saving ? 'جاري الحفظ...' : editId ? 'حفظ التعديلات' : 'إنشاء الكوبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
