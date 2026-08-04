/** Domain models — clean camelCase shapes the UI consumes, decoupled from the
 *  DB's snake_case columns. The data layer maps rows into these. */

export type Cohort = 'student' | 'alumni';

/** Directory/pixel card — from the people_directory view. */
export interface MemberCard {
  id: string;
  publicId: string;
  name: string;
  cohort: Cohort;
  avatarUrl: string | null;
  avatarColor: string | null;
  fields: string[];
}

/** An interest field / tag (from the `fields` table). */
export interface Field {
  id: number;
  name: string;
  createdBy: string | null;
}

/** The signed-in member's own profile (member area — editable). */
export interface MyProfile {
  id: string;
  publicId: string;
  fullName: string;
  gradYear: number | null;
  githubUsername: string | null;
  bio: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  resumeUrl: string | null;
  isPublished: boolean;
  fieldIds: number[];
}

/** A member-created research entry the signed-in member belongs to (dashboard list). */
export interface MyResearchSummary {
  publicId: string;
  title: string;
  isPublished: boolean;
}

/** Directory card for a member-created research entry. */
export interface ResearchEntryCard {
  id: string;
  publicId: string;
  title: string;
  avatarUrl: string | null;
  description: string;
  /** where it was shown/published, e.g. "IDC '26" — card subtitle */
  venue: string | null;
  /** ISO date (yyyy-mm-dd) or null */
  presentedOn: string | null;
  tags: string[];
}

/** A research reference shown on a member's profile. */
export interface MemberResearchRef {
  publicId: string;
  title: string;
}

/** Full member profile — the person page. */
export interface Member {
  publicId: string;
  name: string;
  gradYear: number;
  cohort: Cohort;
  bio: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  resumeUrl: string | null;
  githubUsername: string | null;
  fields: string[];
  research: MemberResearchRef[];
}

export interface ResearchMemberRef {
  /** people.id — needed to add/remove the membership row */
  id: string;
  publicId: string;
  name: string;
  role: string;
  color: string | null;
}

/**
 * A collaborator with no account here (outside co-author, visiting researcher).
 * Display-only credit stored on `research.external_authors` — see the migration
 * for why these aren't `research_members` rows.
 */
export interface ResearchExternalAuthor {
  name: string;
  role?: string;
}

export interface ResearchLink {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
}

export interface ResearchFile {
  id: string;
  storagePath: string;
  kind: string;
  caption: string | null;
  sortOrder: number;
}

/** Full member-created research entry — the DB-backed research page. */
export interface ResearchEntry {
  dbId: string;
  publicId: string;
  title: string;
  description: string;
  avatarUrl: string | null;
  /** where it was shown/published, e.g. "IDC '26" — card subtitle */
  venue: string | null;
  /** ISO date (yyyy-mm-dd) or null */
  presentedOn: string | null;
  published: boolean;
  fields: string[];
  /** field ids, for the editor's tag chips (names are in `fields`) */
  fieldIds: number[];
  members: ResearchMemberRef[];
  /** collaborators without an account here — display-only credits */
  externalAuthors: ResearchExternalAuthor[];
  /** composed block page (null = legacy: render `description`) */
  page: import('./page').ResearchPage | null;
  links: ResearchLink[];
  files: ResearchFile[];
}

// ---------------------------------------------------------------------------
// Research — curated, editorial write-ups (static, in-app). Distinct from the
// member-created DB "research" entries (the renamed projects infra): these are
// long-form articles rendered from preserved HTML, with a structured metadata
// layer on top.
// ---------------------------------------------------------------------------

/** An author of a research entry — a site member (linked) or plain text. */
export interface ResearchAuthor {
  name: string;
  /** public_id of a site member → links to /person?id=; omit for plain text. */
  memberId?: string;
}

/** A resource/file attached to a research entry. */
export interface ResearchResource {
  label: string;
  url: string;
  kind?: 'pdf' | 'link' | 'image' | 'file';
}

/** A curated research entry. Everything here is dev-editable in lib/data/research.ts. */
export interface ResearchItem {
  slug: string; // URL id (/research?id=<slug>)
  title: string;
  venue?: string;
  summary: string; // card + meta description
  thumb?: string; // card image (asset path, basePath-prefixed)
  authors: ResearchAuthor[];
  tags: string[];
  startDate?: string; // ISO date or year
  endDate?: string;
  location?: string;
  resources: ResearchResource[];
  /** Optional custom-layout key resolved by the view registry; default renders
   *  the preserved article body. */
  view?: string;
  /** Path to the preserved write-up HTML; defaults to research/<slug>.html. */
  contentSrc?: string;
}
