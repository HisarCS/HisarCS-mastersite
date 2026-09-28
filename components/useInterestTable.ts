'use client';

import { useEffect, useState } from 'react';
import { loadInterestTable } from '@/lib/data/interests';
import { INTEREST_AREAS, type InterestTable } from '@/lib/domain/interests';

/** one fetch per page load, shared by every component that asks */
let pending: Promise<InterestTable | null> | null = null;

/** Forget the cached table (after an admin edits it). */
export function invalidateInterestTable() {
  pending = null;
}

/** The interest-area table: the built-in one at first, the database's as soon
 *  as it loads (it stays built-in if the database can't be read). */
export function useInterestTable(): InterestTable {
  const [table, setTable] = useState<InterestTable>(INTEREST_AREAS);
  useEffect(() => {
    let alive = true;
    void (pending ??= loadInterestTable()).then((t) => {
      if (alive && t) setTable(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return table;
}
