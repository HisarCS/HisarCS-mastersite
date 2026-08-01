import type { Metadata } from 'next';
import { AboutPage } from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'About Us — ideaLab',
  description:
    'HisarCS — a computer science team from Hisar High School in Istanbul, Turkey. Make, fail, learn, repeat.',
};

// About Us — fully static content, no client data.
export default function About() {
  return <AboutPage />;
}
