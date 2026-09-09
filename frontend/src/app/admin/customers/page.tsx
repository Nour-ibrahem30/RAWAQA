'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import AdminTable from '@/components/admin/AdminTable';
import type { User } from '@/lib/types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
      render: (u: any) => <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'rgba(247,244,236,.6)' }}>{u.phone || '—'}</span>,
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
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#F7F4EC', fontFamily: 'var(--font-fraunces, serif)' }}>Customers</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(247,244,236,.35)' }}>{customers.length} registered</p>
      </div>
      <AdminTable columns={columns} data={customers} loading={loading} keyField="id" emptyText="No customers yet" />
    </div>
  );
}
