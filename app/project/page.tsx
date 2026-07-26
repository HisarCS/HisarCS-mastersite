import { Suspense } from 'react';
import { ProjectRoute } from '@/components/ProjectRoute';

// Single static page; client-fetches /project?id=<public_id> for any id.
export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectRoute />
    </Suspense>
  );
}
