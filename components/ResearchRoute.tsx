'use client';

import { useSearchParams } from 'next/navigation';
import { ResearchView } from './ResearchView';
import { ResearchIndex } from './ResearchIndex';

/** /research → index; /research?id=<slug> → the write-up. */
export function ResearchRoute() {
  const id = useSearchParams().get('id');
  return id ? <ResearchView id={id} /> : <ResearchIndex />;
}
