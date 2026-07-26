import { Suspense } from 'react';
import { ResearchEditRoute } from '@/components/ResearchEditRoute';

// Editor for a member-created research entry: /research/edit?id=<public_id>.
export default function ResearchEditPage() {
  return (
    <Suspense>
      <ResearchEditRoute />
    </Suspense>
  );
}
