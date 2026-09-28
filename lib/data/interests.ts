import { getSupabase } from '../supabase';
import { tableFromRows, type InterestTable } from '../domain/interests';

/** The admin-edited interest areas (interest_areas), or null when the table
 *  is empty or unreachable — callers then keep the built-in fallback. */
export async function loadInterestTable(): Promise<InterestTable | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('interest_areas').select('area, tag, sort');
    if (error || !data?.length) return null;
    return tableFromRows(data as { area: string; tag: string; sort: number }[]);
  } catch {
    return null;
  }
}
