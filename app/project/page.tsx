import { Suspense } from 'react';
import { ProjectRedirect } from '@/components/ProjectRedirect';

// Deprecated route. "Projects" are now "Research"; this redirects old links to
// /research?id=<id>. (Kept as a static page so existing bookmarks resolve.)
export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectRedirect />
    </Suspense>
  );
}
