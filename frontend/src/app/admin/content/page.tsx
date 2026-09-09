'use client';

import { useEffect, useState } from 'react';
import { contentApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { broadcastContentUpdate } from '@/lib/useSiteContent';

const CARD  = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16 };
const GOLD  = '#D2B56A';
const IVORY = '#F7F4EC';
const DIM   = 'rgba(247,244,236,.4)';

const SECTION_LABELS: Record<string, string> = {
  hero:   '🏠 Hero Section',
  about:  '📖 About Section',
  why:    '⭐ Why Rawaqa',
  stats:  '📊 Stats Bar',
  cta:    '🎯 CTA Section',
  footer: '🔗 Footer',
};

const InputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(210,181,106,.12)',
  borderRadius: 10,
  padding: '.65rem .9rem',
  fontSize: '.85rem',
  color: IVORY,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 200ms',
} as React.CSSProperties;

const LabelStyle = {
  display: 'block',
  fontSize: '.62rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase' as const,
  color: DIM,
  marginBottom: '.35rem',
};

function TextField({ label, value, onChange, multiline = false, dir = 'auto' }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; dir?: 'ltr' | 'rtl' | 'auto';
}) {
  const style = { ...InputStyle, direction: dir as any };
  return (
    <div>
      <label style={LabelStyle}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          style={{ ...style, resize: 'vertical', minHeight: 72 }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} style={style}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(210,181,106,.12)')} />
      )}
    </div>
  );
}

export default function AdminContentPage() {
  const { showToast } = useToast();
  const [allContent, setAllContent] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState('hero');
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    contentApi.adminGetAll()
      .then(r => {
        const data = (r.data as any)?.data ?? r.data ?? {};
        const secs = (r.data as any)?.sections ?? Object.keys(data);
        setAllContent(data);
        setSections(secs);
        setActiveSection(secs[0] || 'hero');
        setForm(data[secs[0]] || {});
      })
      .catch(() => showToast('Failed to load content', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setForm({ ...(allContent[section] || {}) });
  };

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await contentApi.update(activeSection, form);
      setAllContent(prev => ({ ...prev, [activeSection]: form }));
      try {
        localStorage.setItem(`rawaqa_content_${activeSection}`, JSON.stringify(form));
      } catch { /* ignore */ }
      broadcastContentUpdate(activeSection); // notify all open tabs instantly
      showToast('Content saved — site updated live!', 'success');
    } catch {
      showToast('Failed to save content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    if (!form) return null;

    // Generic field renderer based on value types
    return Object.entries(form).map(([key, value]) => {
      if (key === 'points' && Array.isArray(value)) {
        // Why section — array of point objects
        return (
          <div key={key} style={{ gridColumn: '1/-1' }}>
            <label style={{ ...LabelStyle, marginBottom: '.75rem' }}>Why Points ({value.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(value as any[]).map((point, idx) => (
                <div key={idx} style={{ ...CARD, padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                  <p style={{ ...LabelStyle, gridColumn: '1/-1', marginBottom: 0 }}>Point {idx + 1}</p>
                  {Object.entries(point).map(([pk, pv]) => (
                    <TextField key={pk} label={pk} value={String(pv)}
                      onChange={v => {
                        const updated = [...value];
                        updated[idx] = { ...updated[idx], [pk]: v };
                        setField(key, updated);
                      }}
                      dir={pk.endsWith('Ar') ? 'rtl' : 'ltr'}
                      multiline={pk.startsWith('body')}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (key === 'items' && Array.isArray(value)) {
        // Stats items
        return (
          <div key={key} style={{ gridColumn: '1/-1' }}>
            <label style={{ ...LabelStyle, marginBottom: '.75rem' }}>Stats Items ({value.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(value as any[]).map((item, idx) => (
                <div key={idx} style={{ ...CARD, padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
                  {Object.entries(item).map(([ik, iv]) => (
                    <TextField key={ik} label={ik} value={String(iv)}
                      onChange={v => {
                        const updated = [...value];
                        updated[idx] = { ...updated[idx], [ik]: v };
                        setField(key, updated);
                      }}
                      dir={ik.endsWith('Ar') ? 'rtl' : 'ltr'}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (typeof value === 'string') {
        const isAr   = key.endsWith('Ar');
        const isLong = key.startsWith('body') || key.startsWith('sub') || key.startsWith('headline');
        return (
          <TextField key={key} label={key} value={value}
            onChange={v => setField(key, v)}
            multiline={isLong}
            dir={isAr ? 'rtl' : 'ltr'}
          />
        );
      }

      return null;
    }).filter(Boolean);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-fraunces, serif)', color: IVORY }}>
            Site Content
          </h1>
          <p style={{ color: DIM, fontSize: '.82rem', marginTop: '.25rem' }}>
            Edit text and images shown on every page section
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || loading} className="btn btn-gold btn-sm">
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Section sidebar */}
        <div style={{ ...CARD, padding: '.5rem', display: 'flex', flexDirection: 'column', gap: '.25rem', position: 'sticky', top: '5rem' }}>
          {sections.map(s => (
            <button key={s} onClick={() => handleSectionChange(s)}
              style={{
                textAlign: 'left', padding: '.6rem .9rem', borderRadius: 10,
                background: activeSection === s ? 'rgba(210,181,106,.12)' : 'transparent',
                color: activeSection === s ? GOLD : DIM,
                border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                transition: 'all 200ms ease',
              }}>
              {SECTION_LABELS[s] || s}
            </button>
          ))}
        </div>

        {/* Fields editor */}
        <div style={{ ...CARD, padding: '1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 56, borderRadius: 10, background: 'rgba(255,255,255,.04)' }} />)}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: IVORY }}>
                  {SECTION_LABELS[activeSection] || activeSection}
                </h2>
                <span style={{ fontSize: '.72rem', color: DIM }}>
                  {Object.keys(form).length} fields
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {renderFields()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
