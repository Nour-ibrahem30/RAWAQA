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
            background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#15130F', border: '1px solid rgba(210,181,106,.2)',
              borderRadius: 20, padding: '2rem', maxWidth: 500, width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F7F4EC' }}>Customer Details</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: 'none', border: 'none', color: '#D2B56A', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <DetailRow label="ID" value={(selectedCustomer as any)._id || selectedCustomer.id} />
              <DetailRow label="Name" value={selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()} />
              <DetailRow label="Email" value={selectedCustomer.email} />
              <DetailRow label="Phone" value={(selectedCustomer as any).phone || (selectedCustomer as any).phoneNumber || (selectedCustomer as any).mobile || 'Not provided'} />
              <DetailRow label="Role" value={selectedCustomer.role} />
              <DetailRow label="Email Verified" value={selectedCustomer.isEmailVerified ? 'Yes' : 'No'} />
              <DetailRow label="Created" value={(selectedCustomer as any).createdAt ? new Date((selectedCustomer as any).createdAt).toLocaleString() : '—'} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
      <span style={{ fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(247,244,236,.4)' }}>{label}</span>
      <span style={{ fontSize: '.9rem', color: '#F7F4EC' }}>{value || '—'}</span>
    </div>
  );
}
