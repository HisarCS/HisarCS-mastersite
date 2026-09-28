import type { ResearchItem } from '../domain/types';

/**
 * Curated research entries (static, editorial). Migrated out of the old
 * public/research.html hardcoded array; the long-form write-ups still live at
 * public/research/<slug>.html and are rendered losslessly by ResearchArticle.
 *
 * This is the one place to edit curated research: authors, tags, dates,
 * location, resources, and citation details are all first-class here. Authors
 * are as each paper was published (given name first); `memberId` links a site
 * member's profile.
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
    authors: [
      { name: 'Ediz Umur' },
      { name: 'Irmak Ureten' },
      { name: 'Kaan Koca' },
      { name: 'Sedat Yalcın' },
    ],
    tags: ['AI Literacy', 'Tangible', "IDC '26"],
    startDate: '2026',
    resources: [],
    citation: {
      title: 'Parse: Teaching How AI Learns Through Tangible Unplugged Modules',
      booktitle:
        'Proceedings of the 25th Annual ACM Interaction Design and Children Conference (IDC ’26)',
      year: 2026,
      pages: '1257–1260',
      location: 'Brighton, UK',
      publisher: 'ACM',
    },
  },
  {
    slug: 'otto',
    title: 'Otto',
    venue: "SCF Adjunct '25",
    summary: 'A multi-modal parametric CAD tool for laser cutting: type it, block it, or drag it.',
    thumb: thumb('otto'),
    authors: [
      { name: 'Sedat Yalcin' },
      { name: 'Emre Dayangac', memberId: 'emre-dayangac' },
      { name: 'Mehmet Bener' },
      { name: 'Irmak Ureten' },
      { name: 'Defne Cecen' },
    ],
    tags: ['Parametric CAD', 'Laser Cutting', "SCF '25"],
    startDate: '2025',
    resources: [],
    citation: {
      title: 'Otto: A Multi-Modal Platform for Accessible Parametric Design',
      booktitle: 'ACM Symposium on Computational Fabrication (SCF Adjunct ’25)',
      year: 2025,
      dates: 'November 20–21',
      location: 'Cambridge, MA, USA',
      publisher: 'ACM',
    },
  },
  {
    slug: 'parametrix',
    title: 'Parametrix',
    venue: "Constructionism '25",
    summary:
      'Teaching parametric design to K-12 through plain-language prompts and a fine-tuned language model.',
    thumb: thumb('parametrix'),
    authors: [
      { name: 'E. Dayangaç', memberId: 'emre-dayangac' },
      { name: 'M. Bener' },
      { name: 'S. Yalçın' },
    ],
    tags: ['Parametric Design', 'K-12', 'LLM', "Constructionism '25"],
    startDate: '2025',
    resources: [],
    citation: {
      title:
        'Parametrix: A Novel Approach to Teaching Parametric Design in K12 and Digital Fabrication Education',
      booktitle: 'Constructionism Conference Proceedings',
      year: 2025,
      pages: '503–506',
      doi: '10.21240/constr/2025/43.X',
    },
  },
  {
    slug: 'testudo',
    title: 'TESTUDO',
    venue: "Constructionism '25",
    summary: 'A $122 AI-driven robotics companion that keeps teaching long after assembly is done.',
    thumb: thumb('testudo'),
    authors: [
      { name: 'K. Tabağ' },
      { name: 'M. Bener' },
      { name: 'E. Dayangaç', memberId: 'emre-dayangac' },
      { name: 'P. Başyurt' },
      { name: 'I. Üreten' },
      { name: 'S. Yalçın' },
    ],
    tags: ['Robotics', 'AI', 'Education', "Constructionism '25"],
    startDate: '2025',
    resources: [],
    citation: {
      title: 'TESTUDO: A Robotics Kit Evolving into an AI-Driven Companion',
      booktitle: 'Constructionism Conference Proceedings',
      year: 2025,
      pages: '523–526',
      doi: '10.21240/constr/2025/79.X',
    },
  },
  {
    slug: 'automata',
    title: 'Automata',
    venue: "Constructionism '25",
    summary:
      'Six AR-integrated mechanical kits bridging theory and hands-on mechanics, tested to 43%→86% accuracy.',
    thumb: thumb('automata'),
    authors: [
      { name: 'S. Yalcin' },
      { name: 'I. Ureten' },
      { name: 'K. Tabag' },
      { name: 'A. B. Bas' },
      { name: 'A. E. Ozcan' },
      { name: 'M. Bilgisel' },
    ],
    tags: ['AR', 'Mechanics', 'Kits', "Constructionism '25"],
    startDate: '2025',
    resources: [],
    citation: {
      title:
        'Automata: AR Integration in Action for Bridging Theory and Application in Mechanical Systems with AI Generating Case Studies',
      booktitle: 'Constructionism Conference Proceedings',
      year: 2025,
      pages: '549–552',
      doi: '10.21240/constr/2025/23.X',
    },
  },
  {
    slug: 'lemon',
    title: 'Lemon',
    venue: 'HCI International ’25',
    summary:
      'Three biomimetic robots, one new skill layered on with every build — from a fish to a dog.',
    thumb: thumb('lemon'),
    authors: [
      { name: 'İ. Baş', memberId: 'iremsubas' },
      { name: 'D. Alp' },
      { name: 'C. Dolu' },
      { name: 'M. Alsan' },
      { name: 'A. E. Koçak' },
      { name: 'I. Atılgan' },
      { name: 'S. Yalçın' },
    ],
    tags: ['Biomimetic Robots', "HCII '25"],
    startDate: '2025',
    resources: [],
    citation: {
      title:
        'Enhancing Prototyping Skills of K-12 Students through Lemon: a Bio-Inspired Robotics Kit',
      booktitle: 'HCI International 2025',
      year: 2025,
    },
  },
  {
    slug: 'pomelo',
    title: 'Pomelo',
    venue: "HRI '19, Daegu",
    summary:
      'A robot dog that teaches algorithmic thinking through physical, hand-held code blocks.',
    thumb: thumb('pomelo'),
    authors: [
      { name: 'L. Nasi' },
      { name: 'Y. Nasi' },
      { name: 'C. Aydın' },
      { name: 'B. Bayraktar' },
      { name: 'R. Taki' },
      { name: 'E. Tabağ' },
      { name: 'S. Yalçın' },
    ],
    tags: ['Robotics', 'Algorithmic Thinking', "HRI '19"],
    startDate: '2019',
    location: 'Daegu, South Korea',
    resources: [],
    citation: {
      title: 'Pomelo, a Collaborative Education Technology Interaction Robot',
      booktitle:
        'Companion of the 2019 ACM/IEEE International Conference on Human-Robot Interaction (HRI ’19 Companion)',
      year: 2019,
      pages: '757–758',
      dates: 'March 11–14',
      location: 'Daegu, Republic of Korea',
      publisher: 'ACM/IEEE',
    },
  },
  {
    slug: 'dancar',
    title: 'DancÆR',
    venue: "AIED '26",
    summary:
      'An AR dance instructor built on real-time pose classification, trained to 95.8% accuracy.',
    thumb: thumb('dancar'),
    authors: [
      { name: 'İremsu Baş', memberId: 'iremsubas' },
      { name: 'Demir Alp' },
      { name: 'Lara Ceren Ergenç' },
      { name: 'Andy Emre Koçak' },
      { name: 'Sedat Yalçın' },
    ],
    tags: ['AR', 'Pose Classification', 'Dance', "AIED '26"],
    startDate: '2026',
    resources: [],
    citation: {
      title:
        'DancÆR: Efficient and Accurate Dance Choreography Learning by Feedback Through Pose Classification',
      booktitle: 'Artificial Intelligence in Education (AIED 2026)',
      year: 2026,
    },
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

/** Path to an item's write-up (markdown, rendered by components/markdown). */
export function researchContentSrc(item: ResearchItem): string {
  return item.contentSrc ?? `${BASE}/research/${item.slug}.md`;
}

/** Absolute URL of a research page (curated or member-made) — for citations
 *  and sharing. Uses the current origin, so local and production both work. */
export function researchPageUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${BASE}/research?id=${encodeURIComponent(slug)}`;
}
