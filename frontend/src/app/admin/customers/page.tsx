'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import AdminTable from '@/components/admin/AdminTable';
import type { User } from '@/lib/types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);

  useEffect(() => {
    adminApi.customers(1)
      .then(r => {
        const raw: any = r.data;
        const list = Array.isArray(raw) ? raw : (raw?.users || []);
        setCustomers(list);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'name', label: 'Customer',
      render: (u: any) => {
        const displayName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Customer';
        return (
          <div>
            <p style={{ color: '#F7F4EC', fontWeight: 500 }}>{displayName}</p>
            <p style={{ color: 'rgba(247,244,236,.35)', fontSize: '.7rem' }}>{u.email}</p>
          </div>
        );
      },
    },
    {
      key: 'phone', label: 'Phone',
      render: (u: any) => {
        const phone = u.phone || u.phoneNumber || u.mobile || '—';
        return <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'rgba(247,244,236,.6)' }}>{phone}</span>;
      },
    },
    {
      key: 'role', label: 'Role',
      render: (u: any) => (
        <span className="text-xs px-2 py-0.5 rounded-pill" style={{
          background: u.role === 'admin' || u.role === 'super_admin' ? 'rgba(210,181,106,.2)' : 'rgba(255,255,255,.06)',
          color: u.role === 'admin' || u.role === 'super_admin' ? '#D2B56A' : 'rgba(247,244,236,.5)',
        }}>
          {u.role}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (u: any) => (
        <button
          onClick={() => setSelectedCustomer(u)}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: 'rgba(210,181,106,.08)',
            border: '1px solid rgba(210,181,106,.2)',
            color: '#D2B56A',
          }}
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>Customers</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.35)' }}>{customers.length} registered</p>
        </div>
        <AdminTable columns={columns} data={customers} loading={loading} keyField="id" emptyText="No customers yet" />
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
            animation: 'fadeIn 300ms ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(21,19,15,.98) 0%, rgba(25,22,17,.98) 100%)',
              border: '1px solid rgba(210,181,106,.25)',
              borderRadius: 24,
              padding: '2.5rem',
              maxWidth: 600,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(210,181,106,.1) inset',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid rgba(210,181,106,.15)',
            }}>
              <div>
                <div style={{
                  fontSize: '.65rem',
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: '#D2B56A',
                  marginBottom: '.5rem',
                  fontWeight: 600,
                }}>
                  Customer Profile
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: '#F7F4EC',
                  fontFamily: 'var(--font-fraunces, serif)',
                  margin: 0,
                }}>
                  {selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim() || 'Customer'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  background: 'rgba(210,181,106,.08)',
                  border: '1px solid rgba(210,181,106,.2)',
                  borderRadius: 12,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D2B56A',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 250ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(210,181,106,.15)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(210,181,106,.08)';
                  e.currentTarget.style.transform = 'rotate(0deg)';
                }}
              >
                ×
              </button>
            </div>

            {/* Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
            }}>
              <DetailRow label="User ID" value={(selectedCustomer as any)._id || selectedCustomer.id} span={2} />
              <DetailRow label="First Name" value={selectedCustomer.firstName} />
              <DetailRow label="Last Name" value={selectedCustomer.lastName} />
              <DetailRow label="Email Address" value={selectedCustomer.email} span={2} icon="📧" />
              <DetailRow
                label="Phone Number"
                value={(selectedCustomer as any).phone || (selectedCustomer as any).phoneNumber || (selectedCustomer as any).mobile || 'Not provided'}
                icon="📱"
              />
              <DetailRow label="Role" value={selectedCustomer.role} badge />
              <DetailRow
                label="Email Verified"
                value={selectedCustomer.isEmailVerified ? 'Verified ✓' : 'Not Verified'}
                verified={selectedCustomer.isEmailVerified}
              />
              <DetailRow
                label="Account Created"
                value={(selectedCustomer as any).createdAt ? new Date((selectedCustomer as any).createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : '—'}
                icon="📅"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({ label, value, span, icon, badge, verified }: {
  label: string;
  value: any;
  span?: number;
  icon?: string;
  badge?: boolean;
  verified?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '.5rem',
      gridColumn: span === 2 ? '1 / -1' : 'auto',
      background: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(210,181,106,.08)',
      borderRadius: 14,
      padding: '1rem 1.25rem',
    }}>
      <span style={{
        fontSize: '.68rem',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: 'rgba(247,244,236,.45)',
        fontWeight: 600,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
        {badge ? (
          <span style={{
            fontSize: '.85rem',
            fontWeight: 600,
            color: value === 'admin' || value === 'super_admin' ? '#D2B56A' : '#F7F4EC',
            background: value === 'admin' || value === 'super_admin' ? 'rgba(210,181,106,.15)' : 'rgba(255,255,255,.05)',
            padding: '.35rem .75rem',
            borderRadius: 8,
            border: `1px solid ${value === 'admin' || value === 'super_admin' ? 'rgba(210,181,106,.3)' : 'rgba(255,255,255,.1)'}`,
          }}>
            {value}
          </span>
        ) : (
          <span style={{
            fontSize: '.95rem',
            color: verified !== undefined ? (verified ? '#4ade80' : 'rgba(247,244,236,.6)') : '#F7F4EC',
            fontWeight: verified ? 600 : 400,
            wordBreak: 'break-word',
          }}>
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  );
}
