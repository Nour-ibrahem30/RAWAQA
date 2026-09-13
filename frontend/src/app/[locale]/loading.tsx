'use client';

import LoadingScreen from '@/components/ui/LoadingScreen';

export default function StoreLoading() {
  return <LoadingScreen isPersistent minDuration={1800} />;
}
