/**
 * Member-area routing state machine — the pure spec of which screen shows given
 * the resolved auth/profile/membership inputs. Kept side-effect-free so it's
 * unit-testable; MemberArea implements this plus the side effects (create the
 * minimal profile on a verified first login, sign out on a bounce).
 */
export type MemberScreen =
  | 'loading' // auth state not resolved yet
  | 'signedout'
  | 'verifying' // signed in, no profile yet, membership check in flight
  | 'notmember' // signed in but not in the HisarCS org
  | 'verifyfail' // signed in but membership couldn't be confirmed
  | 'onboarding' // verified, profile exists but incomplete (no graduation year)
  | 'dashboard'; // profile complete

export type Verdict = 'member' | 'notmember' | 'unverifiable';

export interface MemberStateInput {
  sessionKnown: boolean; // has the initial auth check completed?
  hasSession: boolean;
  profile: { gradYear: number | null } | null;
  verdict: Verdict | null; // null = not yet checked
}

export function deriveMemberScreen(s: MemberStateInput): MemberScreen {
  if (!s.sessionKnown) return 'loading';
  if (!s.hasSession) return 'signedout';
  if (s.profile) return s.profile.gradYear == null ? 'onboarding' : 'dashboard';
  // signed in, no profile yet → the org-membership gate decides
  if (s.verdict === null) return 'verifying';
  if (s.verdict === 'notmember') return 'notmember';
  if (s.verdict === 'unverifiable') return 'verifyfail';
  return 'onboarding'; // verified member → a minimal profile is created, then onboarding
}
