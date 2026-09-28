import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResearchRoute } from '@/components/ResearchRoute';

const description =
  'Papers, workshop proposals, and prototypes from Hisar School ideaLab — searchable by interest, conference, and year.';
export const metadata: Metadata = {
  title: 'Research — ideaLab',
  description,
  openGraph: { title: 'Research — ideaLab', description },
};

// Single static page; client-renders the index or /research?id=<slug>.
export default function ResearchPage() {
  return (
    <Suspense>
      <ResearchRoute />
    </Suspense>
  );
}
