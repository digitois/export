'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSequencePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/email/sequences'); }, [router]);
  return null;
}