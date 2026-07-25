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

/** Directory card for a project (homepage Projects carousel). */
export interface ProjectCard {
  id: string;
  publicId: string;
  title: string;
  avatarUrl: string | null;
}

/** A project reference shown on a member's profile. */
export interface MemberProjectRef {
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
  projects: MemberProjectRef[];
}

export interface ProjectMemberRef {
  publicId: string;
  name: string;
  role: string;
  color: string | null;
}

export interface ProjectLink {
  label: string;
  url: string;
  sortOrder: number;
}

export interface ProjectFile {
  id: string;
  storagePath: string;
  kind: string;
  caption: string | null;
  sortOrder: number;
}

/** Full project — the project page. */
export interface Project {
  dbId: string;
  publicId: string;
  title: string;
  description: string;
  avatarUrl: string | null;
  published: boolean;
  fields: string[];
  members: ProjectMemberRef[];
  links: ProjectLink[];
  files: ProjectFile[];
}
