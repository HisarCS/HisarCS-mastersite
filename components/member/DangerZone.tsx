'use client';

import { useState } from 'react';
import { deleteMyAccount } from '@/lib/data/auth';
import { handlesMatch } from '@/lib/util/handle';
import styles from './DangerZone.module.css';

/**
 * DangerZone (4e) — permanent account deletion. Opens a modal that confirms by
 * typing the member's GitHub handle, then purges storage + runs the delete RPC +
 * signs out (which bubbles through onAuthChange → the signed-out screen). Mirrors
 * member.html danger-zone / tryDelete.
 */
export function DangerZone({ userId, handle }: { userId: string; handle: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const expect = handle;
  const echo = expect ? `@${expect}` : 'your GitHub username';

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirm('');
    setHint('');
  };

  const del = async () => {
    if (!handlesMatch(confirm, expect)) {
      setHint(`✕ that doesn't match — type "${echo}" to confirm`);
      return;
    }
    setBusy(true);
    setHint('deleting your account…');
    const err = await deleteMyAccount(userId);
    if (err) {
      setBusy(false);
      setHint(`✕ ${err}`);
      return;
    }
    // signOutLocal() inside deleteMyAccount fires onAuthChange → MemberArea
    // resolves to the signed-out screen and this whole tree unmounts.
  };

  return (
    <div className={`${styles.panel} ${styles.danger}`}>
      <h2>Danger zone</h2>
      <p className={styles.sub}>
        Deleting your account permanently erases your profile, your place on the homepage, your
        interest tags and research memberships, research where you&apos;re the only member, and your
        GitHub login link. This cannot be undone.
      </p>
      <button className={styles.btnDanger} onClick={() => setOpen(true)}>
        Delete my account
      </button>

      {open && (
        <div className={styles.overlay} role="dialog" aria-modal="true" onClick={close}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete your account?</h3>
            <p className={styles.sub}>This permanently erases:</p>
            <ul className={styles.list}>
              <li>your profile and its place on the homepage</li>
              <li>your interest tags and research memberships</li>
              <li>research where you are the only member</li>
              <li>your GitHub login link</li>
            </ul>
            <label className={styles.f}>
              TYPE YOUR GITHUB USERNAME (<strong>{echo}</strong>) TO CONFIRM
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="GitHub username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={hint.startsWith('✕') ? styles.bad : ''}
            />
            {hint && (
              <div className={`${styles.sub} ${hint.startsWith('✕') ? styles.hintBad : ''}`}>
                {hint}
              </div>
            )}
            <div className={styles.actions}>
              <button className={styles.btnGhost} onClick={close} disabled={busy}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={del} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
