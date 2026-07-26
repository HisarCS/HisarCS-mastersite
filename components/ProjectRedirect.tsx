'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Deprecated: /project?id=<id> → /research?id=<id>. Kept so old links resolve. */
export function ProjectRedirect() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  useEffect(() => {
    router.replace(id ? `/research?id=${encodeURIComponent(id)}` : '/research');
  }, [id, router]);
  return null;
}
