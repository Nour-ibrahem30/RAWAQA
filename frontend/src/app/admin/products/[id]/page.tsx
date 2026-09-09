'use client';

import { useParams } from 'next/navigation';
import ProductForm from '../ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  return <ProductForm productId={id} />;
}

