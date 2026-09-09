'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_COLORS, THEME_PRESETS, type SiteColors, type ThemePreset } from '@/lib/types';
import { applyColors } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { adminApi } from '@/lib/api';

const STORAGE_KEY = 'rawaqa_site_colors';
const COLORS_CHANNEL = 'rawaqa_colors_update';

function broadcastColors(colors: Record<string, string>) {
  try {
    const ch = new BroadcastChannel(COLORS_CHANNEL);
    ch.postMessage({ colors, ts: Date.now() });
    ch.close();
  } catch { /* not supported */ }
}

const COLOR_GROUPS: Array<{
  label: string;
  keys: Array<{ key: keyof SiteColors; label: string; description: string }>;
}> = [
  {
    label: 'Dark Backgrounds',
    keys: [
      { key: 'charcoal', label: 'Charcoal', description: 'Primary dark background — Hero, Footer' },
      { key: 'charcoalSoft', label: 'Charcoal Soft', description: 'Slightly lighter dark — Cards on dark' },
    ],
  },
  {
    label: 'Light Backgrounds',
    keys: [
      { key: 'ivory', label: 'Ivory', description: 'Primary light background — Main pages' },
      { key: 'ivory2', label: 'Ivory 2', description: 'Subtle off-white — Cards on light' },
      { key: 'sand', label: 'Sand', description: 'Warm beige — Borders, hover states, sections' },
    ],
  },
  {
    label: 'Brand Accent (Gold)',
    keys: [
      { key: 'gold', label: 'Gold', description: 'Primary accent — Hover states, highlights' },
      { key: 'goldLight', label: 'Gold Light', description: 'CTA buttons, badges, active states' },
      { key: 'goldPale', label: 'Gold Pale', description: 'Soft accent background — Tags, info blocks' },
    ],
  },
  {
    label: 'Text',
    keys: [
      { key: 'ink', label: 'Ink', description: 'Primary text color' },
      { key: 'inkSoft', label: 'Ink Soft', description: 'Secondary text, captions, labels' },
    ],
  },
  {
    label: 'Category Colors',
    keys: [
      { key: 'clay', label: 'Clay', description: 'Relax category tile color' },
      { key: 'indigo', label: 'Indigo', description: 'Game category tile color' },
      { key: 'ochre', label: 'Ochre', description: 'Kids category tile color' },
      { key: 'forest', label: 'Forest', description: 'Outdoor category tile color' },
      { key: 'dune', label: 'Dune', description: 'Accent — Product highlights' },
    ],
  },
];

function loadLocalColors(): SiteColors {
  if (typeof window === 'undefined') return { ...DEFAULT_COLORS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_COLORS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_COLORS };
}

export default function AdminSettingsPage() {
  const [colors, setColors] = useState<SiteColors>({ ...DEFAULT_COLORS });
  const [saved, setSaved] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);
  const { showToast } = useToast();

  // Load: try server first, fall back to localStorage
  useEffect(() => {
    adminApi.getSettings()
      .then(r => {
        if (r.data && Object.keys(r.data).length > 0) {
          const merged = { ...DEFAULT_COLORS, ...r.data };
          setColors(merged);
          applyColors(merged as unknown as Record<string, string>);
          setServerSynced(true);
        } else {
          const c = loadLocalColors();
          setColors(c);
          applyColors(c as unknown as Record<string, string>);
        }
      })
      .catch(() => {
        const c = loadLocalColors();
        setColors(c);
        applyColors(c as unknown as Record<string, string>);
      });
  }, []);

  const handleChange = (key: keyof SiteColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    applyColors(updated as unknown as Record<string, string>);
    setSaved(false);
  };

  const handleSave = async () => {
    // Always save to localStorage as fallback
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    applyColors(colors as unknown as Record<string, string>);

    try {
      await adminApi.updateSettings(colors as unknown as Record<string, string>);
      broadcastColors(colors as unknown as Record<string, string>); // push to all tabs
      setServerSynced(true);
      setSaved(true);
      showToast('Theme saved — site colors updated live!', 'success');
    } catch {
      // Server save failed — localStorage still worked
      setSaved(true);
      showToast('Theme saved locally. Server sync failed.', 'error');
    }
  };

  const handleReset = () => {
    if (!confirm('Reset all colors to defaults?')) return;
    setColors({ ...DEFAULT_COLORS });
    applyColors(DEFAULT_COLORS as unknown as Record<string, string>);
    localStorage.removeItem(STORAGE_KEY);
    setSaved(false);
    showToast('Colors reset to defaults.', 'success');
  };

  const CARD = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', borderRadius: 16, padding: 24 };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>
            Site Settings
          </h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(247,244,236,.4)' }}>
            Customize the brand color palette. Changes preview live on the site.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-sm px-4 py-2 rounded-pill"
            style={{ border: '1px solid rgba(210,181,106,.2)', color: 'rgba(247,244,236,.5)' }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="text-sm font-semibold px-5 py-2 rounded-pill"
            style={{ background: saved ? '#4B5B45' : '#D2B56A', color: saved ? '#fff' : '#15130F' }}
          >
            {saved ? (serverSynced ? '✓ Saved to Server' : '✓ Saved Locally') : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Preset Themes Selector */}
      <div style={CARD}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#D2B56A' }}>
              🎨 Ready-to-Use Theme Presets
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.4)' }}>
              Choose a professionally curated theme palette or customize individual colors below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {THEME_PRESETS.map((preset: ThemePreset) => {
            const isCurrent = JSON.stringify(colors) === JSON.stringify(preset.colors);
            return (
              <div
                key={preset.id}
                onClick={() => {
                  setColors(preset.colors);
                  applyColors(preset.colors as unknown as Record<string, string>);
                  setSaved(false);
                  showToast(`Applied "${preset.name}". Click "Save Changes" to publish!`, 'default');
                }}
                className="p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between"
                style={{
                  background: isCurrent ? 'rgba(210,181,106,.1)' : '#1B1813',
                  border: isCurrent ? '2px solid #D2B56A' : '1px solid rgba(210,181,106,.15)',
                  boxShadow: isCurrent ? '0 0 16px rgba(210,181,106,.15)' : 'none',
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: isCurrent ? '#D2B56A' : '#F7F4EC' }}>
                      {preset.name}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#D2B56A', color: '#15130F' }}>
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: 'rgba(247,244,236,.45)' }}>
                    {preset.description}
                  </p>
                </div>

                {/* Color swatch preview bar */}
                <div className="flex gap-1.5 mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="w-5 h-5 rounded-md" style={{ background: preset.colors.charcoal }} title="Dark BG" />
                  <div className="w-5 h-5 rounded-md" style={{ background: preset.colors.ivory }} title="Light BG" />
                  <div className="w-5 h-5 rounded-md" style={{ background: preset.colors.gold }} title="Accent Gold" />
                  <div className="w-5 h-5 rounded-md" style={{ background: preset.colors.goldLight }} title="Accent Light" />
                  <div className="w-5 h-5 rounded-md" style={{ background: preset.colors.ink }} title="Text Ink" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview Strip */}
      <div style={CARD}>
        <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(247,244,236,.4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Live Preview
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(colors) as Array<keyof SiteColors>).map(key => (
            <div
              key={key}
              title={key}
              className="w-7 h-7 rounded-full border-2 border-transparent cursor-pointer"
              style={{ background: colors[key], boxShadow: '0 0 0 1px rgba(255,255,255,.1)' }}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button className="btn btn-gold btn-sm" style={{ background: colors.goldLight, color: colors.charcoal }}>
            Primary Button
          </button>
          <button className="btn btn-line btn-sm" style={{ border: `1px solid rgba(38,33,23,.28)`, color: colors.ink }}>
            Secondary Button
          </button>
          <span className="px-3 py-1 text-xs rounded-pill font-semibold" style={{ background: colors.goldPale, color: colors.gold }}>
            Badge
          </span>
        </div>
        <div className="mt-4 p-3 rounded-xl" style={{ background: colors.ivory }}>
          <p className="font-bold" style={{ color: colors.ink, fontFamily: 'var(--font-fraunces, serif)' }}>
            The Cloud Lounger
          </p>
          <p style={{ color: colors.inkSoft, fontSize: '.82rem' }}>Premium bean bag for total relaxation</p>
          <p className="font-bold mt-1" style={{ color: colors.gold }}>EGP 3,450</p>
        </div>
      </div>

      {/* Color groups */}
      {COLOR_GROUPS.map(group => (
        <div key={group.label} style={CARD}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#D2B56A' }}>{group.label}</p>
          <div className="flex flex-col gap-4">
            {group.keys.map(({ key, label, description }) => (
              <div key={key} className="flex items-center gap-4">
                {/* Color picker */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-xl cursor-pointer"
                    style={{
                      background: colors[key],
                      boxShadow: '0 0 0 1px rgba(255,255,255,.12), inset 0 0 0 1px rgba(0,0,0,.1)',
                    }}
                  />
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    title={`Pick ${label} color`}
                  />
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#F7F4EC' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'rgba(247,244,236,.35)' }}>{description}</p>
                </div>

                {/* Hex input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleChange(key, v);
                    }}
                    onBlur={e => {
                      if (!/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        handleChange(key, DEFAULT_COLORS[key]);
                      }
                    }}
                    className="w-24 text-xs text-center px-2 py-1.5 rounded-lg font-mono"
                    style={{ background: '#1E1B15', border: '1px solid rgba(210,181,106,.2)', color: '#F7F4EC', outline: 'none' }}
                  />
                  {colors[key] !== DEFAULT_COLORS[key] && (
                    <button
                      onClick={() => handleChange(key, DEFAULT_COLORS[key])}
                      title="Reset to default"
                      className="text-xs"
                      style={{ color: 'rgba(247,244,236,.3)' }}
                    >
                      ↩
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save footer */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={handleSave}
          className="text-sm font-semibold px-6 py-3 rounded-pill"
          style={{ background: saved ? '#4B5B45' : '#D2B56A', color: saved ? '#fff' : '#15130F' }}
        >
          {saved ? (serverSynced ? '✓ Saved to Server' : '✓ Saved Locally') : 'Save Changes'}
        </button>
        <button
          onClick={handleReset}
          className="text-sm px-6 py-3 rounded-pill"
          style={{ border: '1px solid rgba(210,181,106,.2)', color: 'rgba(247,244,236,.5)' }}
        >
          Reset All to Defaults
        </button>
      </div>

      {/* Sync status note */}
      <p className="text-xs pb-4" style={{ color: 'rgba(247,244,236,.25)' }}>
        {serverSynced
          ? '✓ Colors are synced with the server. All admins and devices will see the same theme.'
          : '⚠ Colors saved to localStorage only. Click "Save Changes" to persist to the server.'}
      </p>
    </div>
  );
}
