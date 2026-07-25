'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  createMinimalProfile,
  getAuthUser,
  getMyProfile,
  onAuthChange,
  signInWithGitHub,
  signOutLocal,
  verifyOrgMembership,
} from '@/lib/data/auth';
import type { MemberScreen } from '@/lib/domain/memberState';
import type { MyProfile } from '@/lib/domain/types';
import styles from './MemberArea.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Member area — auth + routing state machine (see lib/domain/memberState.ts for
 * the tested spec). Phase 4a: sign-in, org-membership gate, and the signed-out /
 * not-member / verify-fail screens. Onboarding (4b) and dashboard (4c) follow.
 */
export function MemberArea() {
  const [screen, setScreen] = useState<MemberScreen>('loading');
  const [, setProfile] = useState<MyProfile | null>(null);
  const [ghLogin, setGhLogin] = useState('you');
  const [reason, setReason] = useState('');
  const [signinHint, setSigninHint] = useState('');
  // after a bounce we sign the user out; this keeps the bounce screen showing
  // (instead of reverting to signed-out on the SIGNED_OUT event).
  const bounced = useRef<null | 'notmember' | 'verifyfail'>(null);

  const resolve = useCallback(async () => {
    const user = await getAuthUser();
    if (!user) {
      setScreen(bounced.current ?? 'signedout');
      return;
    }
    setGhLogin(user.githubLogin || 'you');

    const existing = await getMyProfile(user.userId);
    if (existing) {
      setProfile(existing);
      setScreen(existing.gradYear == null ? 'onboarding' : 'dashboard');
      return;
    }

    setScreen('verifying');
    const result = await verifyOrgMembership();
    if (result.verdict === 'notmember') {
      bounced.current = 'notmember';
      setScreen('notmember');
      await signOutLocal();
      return;
    }
    if (result.verdict === 'unverifiable') {
      bounced.current = 'verifyfail';
      setReason(result.reason);
      setScreen('verifyfail');
      await signOutLocal();
      return;
    }
    const created = await createMinimalProfile(user);
    if (!created) {
      setScreen('signedout');
      setSigninHint("couldn't create your profile — try signing in again");
      return;
    }
    setProfile(created);
    setScreen('onboarding');
  }, []);

  useEffect(() => {
    void resolve();
    return onAuthChange(resolve);
  }, [resolve]);

  const doSignIn = async () => {
    bounced.current = null;
    setSigninHint('');
    const err = await signInWithGitHub();
    if (err) setSigninHint(`✕ ${err} — is the GitHub provider configured? (README §4 / §7)`);
  };

  const header = (
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>
        idea<span>Lab</span>
      </Link>
      <a href={`${BASE}/research.html`} className={styles.research}>
        Research
      </a>
    </header>
  );

  return (
    <>
      {header}
      <main className={styles.main}>
        {screen === 'loading' && <div className={styles.centerWrap} aria-busy="true" />}

        {screen === 'verifying' && (
          <div className={styles.centerWrap}>
            <div className={styles.authCard}>
              <div className={styles.mark}>
                .<span>)</span>
              </div>
              <p className={styles.sub}>Checking your membership…</p>
            </div>
          </div>
        )}

        {screen === 'signedout' && (
          <div className={styles.centerWrap}>
            <div className={styles.authCard}>
              <div className={styles.mark}>
                .<span>)</span>
              </div>
              <h1>Member sign in</h1>
              <p className={styles.sub}>
                For ideaLab students and alumni. Sign in with GitHub to create and manage your
                profile and projects.
              </p>
              <button className={styles.ghBtn} onClick={doSignIn}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Continue with GitHub
              </button>
              {signinHint && <div className={`${styles.sub} ${styles.hintBad}`}>{signinHint}</div>}
            </div>
          </div>
        )}

        {screen === 'notmember' && (
          <div className={styles.centerWrap}>
            <div className={styles.authCard}>
              <div className={styles.mark}>
                .<span className={styles.muted}>)</span>
              </div>
              <h1>Not one of us — yet</h1>
              <p className={styles.sub}>
                This member area is for people in the <strong>HisarCS</strong> GitHub organization.
                Your GitHub account (<strong>@{ghLogin}</strong>) isn&apos;t in it.
              </p>
              <p className={styles.sub}>
                If you&apos;re an existing ideaLab student or alumni, email us and we&apos;ll get
                you set up:
              </p>
              <a className={styles.ghBtn} href="mailto:hisarcs@hisarschool.k12.tr">
                hisarcs@hisarschool.k12.tr
              </a>
              <div className={styles.backRow}>
                <Link className={styles.btnGhost} href="/">
                  ← back to the mark
                </Link>
              </div>
            </div>
          </div>
        )}

        {screen === 'verifyfail' && (
          <div className={styles.centerWrap}>
            <div className={styles.authCard}>
              <div className={styles.mark}>
                .<span>(</span>
              </div>
              <h1>Couldn&apos;t verify your membership</h1>
              <p className={styles.sub}>
                You signed in as <strong>@{ghLogin}</strong>, but we couldn&apos;t confirm
                you&apos;re in the <strong>HisarCS</strong> GitHub organization.{' '}
                <strong>
                  If you are a member, this is almost certainly a setup issue on our side.
                </strong>
              </p>
              <div className={styles.actionRow}>
                <button className={styles.ghBtn} onClick={doSignIn}>
                  Try again
                </button>
                <a className={styles.btnGhost} href="mailto:hisarcs@hisarschool.k12.tr">
                  Email us
                </a>
              </div>
              <div className={styles.backRow}>
                <Link className={styles.btnGhost} href="/">
                  ← back to the mark
                </Link>
              </div>
              {reason && <div className={styles.reason}>{reason}</div>}
            </div>
          </div>
        )}

        {(screen === 'onboarding' || screen === 'dashboard') && (
          <div className={styles.panel}>
            <h1>
              {screen === 'onboarding' ? 'Welcome to ideaLab ' : 'Your dashboard '}
              <span className={styles.accent}>.)</span>
            </h1>
            <p className={styles.sub}>
              Signed in as <strong>@{ghLogin}</strong>.{' '}
              {screen === 'onboarding' ? 'Onboarding' : 'The dashboard'} UI lands in the next
              sub-step.{' '}
              <button className={styles.linkBtn} onClick={() => void signOutLocal().then(resolve)}>
                sign out
              </button>
            </p>
          </div>
        )}
      </main>
    </>
  );
}
