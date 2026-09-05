'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import '../globals.css';

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/ar/login');
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0e0a' }}>
        <div className="text-center">
          <svg width="40" height="40" viewBox="0 0 60 60" fill="none" className="mx-auto mb-4 animate-pulse">
            <circle cx="30" cy="30" r="28" stroke="#D2B56A" strokeWidth="1.1" opacity=".5" />
            <path d="M18 36c0-9 5-16 12-16s12 7 12 16c0 4-5 6-12 6s-12-2-12-6z" stroke="#D2B56A" strokeWidth="1.4" />
          </svg>
          <p style={{ color: 'rgba(247,244,236,.4)', fontSize: '.8rem', letterSpacing: '.1em' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: '⌂', label: 'Dashboard' },
    { href: '/admin/products', icon: '⊞', label: 'Products' },
    { href: '/admin/categories', icon: '◈', label: 'Categories' },
    { href: '/admin/orders', icon: '✦', label: 'Orders' },
    { href: '/admin/customers', icon: '◎', label: 'Customers' },
    { href: '/admin/settings', icon: '◐', label: 'Site Settings' },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex" style={{ background: '#0f0e0a', color: '#F7F4EC', fontFamily: 'var(--font-manrope, sans-serif)' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}
        style={{ width: 240, background: '#15130F', borderRight: '1px solid rgba(210,181,106,.12)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b" style={{ borderColor: 'rgba(210,181,106,.12)' }}>
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="28" stroke="rgba(247,244,236,.4)" strokeWidth="1.1" />
            <path d="M18 36c0-9 5-16 12-16s12 7 12 16c0 4-5 6-12 6s-12-2-12-6z" stroke="#D2B56A" strokeWidth="1.4" />
          </svg>
          <div>
            <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: '1rem', letterSpacing: '.12em' }}>RAWAQA</p>
            <p style={{ fontSize: '.62rem', letterSpacing: '.1em', color: 'rgba(247,244,236,.3)', textTransform: 'uppercase' }}>Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all"
              style={{
                background: isActive(item.href) ? 'rgba(210,181,106,.12)' : 'transparent',
                color: isActive(item.href) ? '#D2B56A' : 'rgba(247,244,236,.6)',
              }}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(210,181,106,.12)' }}>
          <p style={{ fontSize: '.75rem', color: 'rgba(247,244,236,.5)', marginBottom: 4 }}>{user?.email}</p>
          <button
            onClick={() => logout().then(() => router.push('/ar/login'))}
            style={{ fontSize: '.72rem', color: 'rgba(247,244,236,.35)', letterSpacing: '.05em' }}
            className="hover:text-ivory transition-colors"
          >
            Sign Out →
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-20"
          style={{ background: '#0f0e0a', borderColor: 'rgba(210,181,106,.1)' }}
        >
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)} style={{ color: 'rgba(247,244,236,.6)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm font-medium" style={{ color: 'rgba(247,244,236,.5)' }}>
            {navItems.find(n => isActive(n.href))?.label || 'Admin'}
          </p>
          <Link href="/ar" style={{ fontSize: '.72rem', color: '#D2B56A', letterSpacing: '.05em' }}>
            ← View Site
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <AdminShell>{children}</AdminShell>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
