'use client';

import { useSearchParams } from 'next/navigation';
import { ProjectView } from './ProjectView';

/** Reads ?id= and hands it to ProjectView (kept thin; ProjectView is reusable). */
export function ProjectRoute() {
  const id = useSearchParams().get('id') ?? '';
  return <ProjectView id={id} />;
}
