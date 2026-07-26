'use client';

import { useSearchParams } from 'next/navigation';
import { PersonView } from './PersonView';

/** Reads ?id= and hands it to PersonView. Kept thin so PersonView stays
 *  reusable — the Phase 3 carousel modal renders PersonView with an id directly,
 *  not from the URL. */
export function PersonRoute() {
  const id = useSearchParams().get('id') ?? '';
  return <PersonView id={id} />;
}
