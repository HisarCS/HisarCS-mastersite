import { Suspense } from 'react';
import { ResearchRoute } from '@/components/ResearchRoute';

// Single static page; client-renders the index or /research?id=<slug>.
export default function ResearchPage() {
  return (
    <Suspense>
      <ResearchRoute />
    </Suspense>
  );
}
