import type { Metadata } from 'next';
import { MembersIndex } from '@/components/MembersIndex';

const description =
  'The makers of Hisar School ideaLab — current students and alumni, by class and interest.';
export const metadata: Metadata = {
  title: 'Members — ideaLab',
  description,
  openGraph: { title: 'Members — ideaLab', description },
};

// Members directory — a grid of member cards, each linking to its profile page.
export default function MembersPage() {
  return <MembersIndex />;
}
