import { describe, it, expect } from 'vitest';
import { deriveMemberScreen, type MemberStateInput } from '../../lib/domain/memberState';

const base: MemberStateInput = {
  sessionKnown: true,
  hasSession: false,
  profile: null,
  verdict: null,
};

describe('deriveMemberScreen', () => {
  it('is loading until the auth state is known', () => {
    expect(deriveMemberScreen({ ...base, sessionKnown: false })).toBe('loading');
  });

  it('is signed-out with no session', () => {
    expect(deriveMemberScreen({ ...base, hasSession: false })).toBe('signedout');
  });

  it('routes an existing profile by graduation year', () => {
    const signedIn = { ...base, hasSession: true };
    expect(deriveMemberScreen({ ...signedIn, profile: { gradYear: null } })).toBe('onboarding');
    expect(deriveMemberScreen({ ...signedIn, profile: { gradYear: 2028 } })).toBe('dashboard');
  });

  describe('signed in, no profile yet → membership gate', () => {
    const gate = { ...base, hasSession: true, profile: null };
    it('is verifying while the check is in flight', () => {
      expect(deriveMemberScreen({ ...gate, verdict: null })).toBe('verifying');
    });
    it('bounces a non-member', () => {
      expect(deriveMemberScreen({ ...gate, verdict: 'notmember' })).toBe('notmember');
    });
    it('shows verify-fail when the check could not run', () => {
      expect(deriveMemberScreen({ ...gate, verdict: 'unverifiable' })).toBe('verifyfail');
    });
    it('sends a verified member to onboarding (minimal profile is then created)', () => {
      expect(deriveMemberScreen({ ...gate, verdict: 'member' })).toBe('onboarding');
    });
  });

  it('prefers an existing profile over the membership verdict', () => {
    // a returning member with a complete profile never hits the gate
    expect(
      deriveMemberScreen({
        sessionKnown: true,
        hasSession: true,
        profile: { gradYear: 2027 },
        verdict: 'notmember',
      }),
    ).toBe('dashboard');
  });
});
