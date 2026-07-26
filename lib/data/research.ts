import type { ResearchItem } from '../domain/types';

/**
 * Curated research entries (static, editorial). Migrated out of the old
 * public/research.html hardcoded array; the long-form write-ups still live at
 * public/research/<slug>.html and are rendered losslessly by ResearchArticle.
 *
 * This is the one place to edit curated research: authors, tags, dates,
 * location, and resources are all first-class here. `authors` are seeded empty —
 * fill them in as plain text or with a `memberId` to link a site member.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const thumb = (slug: string) => `${BASE}/research/thumb/${slug}.jpg`;

export const RESEARCH_ITEMS: ResearchItem[] = [
  {
    slug: 'parse',
    title: 'Parse',
    venue: "IDC '26",
    summary: 'Tangible unplugged modules teaching how AI models are built — no screens required.',
    thumb: thumb('parse'),
    authors: [],
    tags: ['AI Literacy', 'Tangible', "IDC '26"],
    startDate: '2026',
    resources: [],
  },
  {
    slug: 'otto',
    title: 'Otto',
    venue: "SCF Adjunct '25",
    summary: 'A multi-modal parametric CAD tool for laser cutting: type it, block it, or drag it.',
    thumb: thumb('otto'),
    authors: [],
    tags: ['Parametric CAD', 'Laser Cutting', "SCF '25"],
    startDate: '2025',
    resources: [],
  },
  {
    slug: 'parametrix',
    title: 'Parametrix',
    venue: "Constructionism '25",
    summary:
      'Teaching parametric design to K-12 through plain-language prompts and a fine-tuned language model.',
    thumb: thumb('parametrix'),
    authors: [],
    tags: ['Parametric Design', 'K-12', 'LLM', "Constructionism '25"],
    startDate: '2025',
    resources: [],
  },
  {
    slug: 'testudo',
    title: 'TESTUDO',
    venue: "Constructionism '25",
    summary: 'A $122 AI-driven robotics companion that keeps teaching long after assembly is done.',
    thumb: thumb('testudo'),
    authors: [],
    tags: ['Robotics', 'AI', 'Education', "Constructionism '25"],
    startDate: '2025',
    resources: [],
  },
  {
    slug: 'automata',
    title: 'Automata',
    venue: "Constructionism '25",
    summary:
      'Six AR-integrated mechanical kits bridging theory and hands-on mechanics, tested to 43%→86% accuracy.',
    thumb: thumb('automata'),
    authors: [],
    tags: ['AR', 'Mechanics', 'Kits', "Constructionism '25"],
    startDate: '2025',
    resources: [],
  },
  {
    slug: 'lemon',
    title: 'Lemon',
    venue: 'HCI International ’25',
    summary:
      'Three biomimetic robots, one new skill layered on with every build — from a fish to a dog.',
    thumb: thumb('lemon'),
    authors: [],
    tags: ['Biomimetic Robots', "HCII '25"],
    startDate: '2025',
    resources: [],
  },
  {
    slug: 'pomelo',
    title: 'Pomelo',
    venue: "HRI '19, Daegu",
    summary:
      'A robot dog that teaches algorithmic thinking through physical, hand-held code blocks.',
    thumb: thumb('pomelo'),
    authors: [],
    tags: ['Robotics', 'Algorithmic Thinking', "HRI '19"],
    startDate: '2019',
    location: 'Daegu, South Korea',
    resources: [],
  },
  {
    slug: 'dancar',
    title: 'DancÆR',
    venue: 'ideaLab manuscript',
    summary:
      'An AR dance instructor built on real-time pose classification, trained to 95.8% accuracy.',
    thumb: thumb('dancar'),
    authors: [],
    tags: ['AR', 'Pose Classification', 'Dance'],
    resources: [],
  },
];

/** All curated research, in listed order. */
export function listResearch(): ResearchItem[] {
  return RESEARCH_ITEMS;
}

/** One curated research entry by slug, or null. */
export function getResearchItem(slug: string): ResearchItem | null {
  return RESEARCH_ITEMS.find((r) => r.slug === slug) ?? null;
}

/** Path to the preserved write-up HTML for an item. */
export function researchContentSrc(item: ResearchItem): string {
  return item.contentSrc ?? `${BASE}/research/${item.slug}.html`;
}
