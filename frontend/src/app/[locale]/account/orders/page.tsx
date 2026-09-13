'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AccountOrdersRedirect() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';

  useEffect(() => {
    router.replace(`/${locale}/account`);
  }, [locale, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0e0a' }}>
      <div className="animate-pulse" style={{ color: '#D2B56A' }}>...</div>
    </div>
  );
}
