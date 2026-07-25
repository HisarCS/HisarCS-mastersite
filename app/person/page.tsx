import { Suspense } from 'react';
import { PersonRoute } from '@/components/PersonRoute';

// A single static page that client-fetches /person?id=<public_id> — works for
// ANY id (published or not, RLS decides), no build-time enumeration. useSearchParams
// requires a Suspense boundary under output:export.
export default function PersonPage() {
  return (
    <Suspense>
      <PersonRoute />
    </Suspense>
  );
}
