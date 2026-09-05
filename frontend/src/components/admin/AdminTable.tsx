'use client';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  keyField: keyof T;
  emptyText?: string;
}

const ADMIN_DARK = { background: '#15130F', border: '1px solid rgba(210,181,106,.1)', color: '#F7F4EC' };

export default function AdminTable<T>({ columns, data, loading, keyField, emptyText = 'No data' }: Props<T>) {
  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden" style={ADMIN_DARK}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b" style={{ borderColor: 'rgba(210,181,106,.08)' }}>
            {columns.map(c => (
              <div key={c.key} className="h-4 rounded flex-1" style={{ background: 'rgba(255,255,255,.06)' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl px-6 py-16 text-center" style={ADMIN_DARK}>
        <p style={{ color: 'rgba(247,244,236,.3)', fontSize: '.85rem' }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={ADMIN_DARK}>
      {/* Header */}
      <div
        className="flex gap-4 px-5 py-3 border-b"
        style={{ borderColor: 'rgba(210,181,106,.1)', background: 'rgba(255,255,255,.03)' }}
      >
        {columns.map(c => (
          <div
            key={c.key}
            className="text-[.65rem] tracking-widest uppercase font-semibold"
            style={{ color: 'rgba(247,244,236,.35)', flex: c.width ?? 1, minWidth: 0 }}
          >
            {c.label}
          </div>
        ))}
      </div>
      {/* Rows */}
      {data.map(row => (
        <div
          key={String(row[keyField])}
          className="flex gap-4 px-5 py-3.5 border-b transition-colors"
          style={{ borderColor: 'rgba(210,181,106,.06)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {columns.map(c => (
            <div
              key={c.key}
              className="text-sm"
              style={{ color: '#F7F4EC', flex: c.width ?? 1, minWidth: 0, overflow: 'hidden' }}
            >
              {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
