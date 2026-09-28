import type { Metadata } from 'next';
import { AdminArea } from '@/components/AdminArea';

export const metadata: Metadata = {
  title: 'Admin — ideaLab',
  robots: { index: false, follow: false },
};

// Static shell; everything is gated client-side by is_admin() and, for real,
// by the database's RLS (ADR-0022).
export default function AdminPage() {
  return <AdminArea />;
}
