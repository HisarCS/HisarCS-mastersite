'use client';

import { useSearchParams } from 'next/navigation';
import { ResearchEditor } from './ResearchEditor';
import { Unavailable } from './Unavailable';

/** Reads ?id= and hands it to ResearchEditor. */
export function ResearchEditRoute() {
  const id = useSearchParams().get('id');
  if (!id) {
    return <Unavailable heading="Nothing to edit" detail="This link is missing a research id." />;
  }
  return <ResearchEditor id={id} />;
}
