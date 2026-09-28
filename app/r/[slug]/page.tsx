import type { Metadata } from 'next';
import { listShareCards } from '@/lib/data/shareable';
import { BASE_PATH } from '@/lib/site';
import { ShareRedirect } from '@/components/ShareRedirect';
import styles from '@/components/ShareRedirect.module.css';

/**
 * /r/<slug>/ — a research entry's share page (ADR-0021). Static HTML with the
 * entry's link-preview tags for bots that don't run JavaScript (Slack,
 * WhatsApp, iMessage, LinkedIn…); people are sent on to the real page.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listShareCards()).map((c) => ({ slug: c.slug }));
}

type Props = { params: Promise<{ slug: string }> };

const card = async (slug: string) => (await listShareCards()).find((c) => c.slug === slug)!;
const target = (slug: string) => `${BASE_PATH}/research/?id=${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await card(slug);
  const title = `${c.title} — ideaLab`;
  const self = `${BASE_PATH}/r/${slug}/`;
  return {
    title,
    description: c.description,
    // og:url is this page: crawlers that follow og:url must land on the tags
    alternates: { canonical: self },
    openGraph: {
      title,
      description: c.description,
      url: self,
      type: 'article',
      ...(c.image ? { images: [{ url: c.image, alt: c.title }] } : {}),
    },
    twitter: {
      card: c.image ? 'summary_large_image' : 'summary',
      title,
      description: c.description,
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params;
  const c = await card(slug);
  return (
    <main className={styles.main}>
      <ShareRedirect to={target(slug)} />
      <div className={styles.eyebrow}>Hisar School ideaLab</div>
      <h1 className={styles.title}>{c.title}</h1>
      {c.subtitle && <div className={styles.venue}>{c.subtitle}</div>}
      <p className={styles.desc}>{c.description}</p>
      <a className={styles.open} href={target(slug)}>
        Open the research page →
      </a>
    </main>
  );
}
