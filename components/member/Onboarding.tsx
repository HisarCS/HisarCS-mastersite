'use client';

import { useEffect, useState } from 'react';
import { completeOnboarding, createField, listFields, syncPersonFields } from '@/lib/data/profile';
import { GRAD_YEAR_MIN, cleanYearInput, gradYearMax, isValidGradYear } from '@/lib/util/year';
import type { Field, MyProfile } from '@/lib/domain/types';
import styles from './Onboarding.module.css';

/**
 * Onboarding (4b) — completes the person row (name + graduation year + interest
 * fields). New fields typed here are STAGED and created only on submit (typos
 * removed before submit never touch the DB). Mirrors member.html createProfile.
 */
export function Onboarding({
  profile,
  ghLogin,
  onComplete,
}: {
  profile: MyProfile;
  ghLogin: string;
  onComplete: () => void;
}) {
  const [name, setName] = useState(
    profile.fullName && profile.fullName !== 'New Maker' ? profile.fullName : '',
  );
  const [year, setYear] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(profile.fieldIds));
  const [staged, setStaged] = useState<string[]>([]);
  const [newField, setNewField] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listFields().then(setFields);
  }, []);

  const yearNum = parseInt(year, 10);
  const yearValid = year.length === 4 && isValidGradYear(yearNum);
  const yearHint =
    year.length < 4
      ? `4-digit year, ${GRAD_YEAR_MIN}–${gradYearMax()}`
      : yearValid
        ? '✓ your student/alumni status follows this year automatically'
        : `✕ must be between ${GRAD_YEAR_MIN} and ${gradYearMax()}`;

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const addField = () => {
    const nm = newField.replace(/\s+/g, ' ').trim();
    setNewField('');
    if (!nm) return;
    const existing = fields.find((f) => f.name.toLowerCase() === nm.toLowerCase());
    if (existing) {
      setSelected((s) => new Set(s).add(existing.id));
      return;
    }
    if (!staged.some((n) => n.toLowerCase() === nm.toLowerCase())) {
      setStaged((s) => [...s, nm]);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setHint('✕ your name is required');
      return;
    }
    if (!yearValid) {
      setHint('✕ fix the graduation year first');
      return;
    }
    setBusy(true);
    setHint('');
    const finalIds = new Set(selected);
    for (const nm of staged) {
      const f = await createField(nm);
      if (!f) {
        setBusy(false);
        setHint(`✕ couldn't create “${nm}” — try again`);
        return;
      }
      finalIds.add(f.id);
    }
    const updated = await completeOnboarding(profile.id, name.trim(), yearNum);
    if (!updated) {
      setBusy(false);
      setHint('✕ could not save your profile — try again');
      return;
    }
    await syncPersonFields(profile.id, profile.fieldIds, [...finalIds]);
    onComplete();
  };

  return (
    <div className={styles.panel}>
      <h1>
        Welcome to ideaLab <span className={styles.accent}>.)</span>
      </h1>
      <p className={styles.sub}>
        You&apos;re signed in as <strong>@{ghLogin}</strong>. Set up your profile — it stays hidden
        until you publish it.
      </p>

      <label className={styles.f}>FULL NAME</label>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className={styles.f}>GRADUATION YEAR</label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="2008 and beyond"
        value={year}
        onChange={(e) => setYear(cleanYearInput(e.target.value))}
      />
      <div
        className={`${styles.sub} ${year.length === 4 ? (yearValid ? styles.ok : styles.bad) : ''}`}
      >
        {yearHint}
      </div>

      <label className={styles.f}>
        GITHUB <span className={styles.lock}>from your login</span>
      </label>
      <input type="text" value={`@${ghLogin}`} disabled />

      <label className={styles.f}>FIELDS OF INTEREST</label>
      <div className={styles.chips}>
        {fields.map((f) => (
          <button
            key={f.id}
            className={`${styles.chip} ${selected.has(f.id) ? styles.on : ''}`}
            onClick={() => toggle(f.id)}
          >
            {f.name}
          </button>
        ))}
        {staged.map((nm) => (
          <button
            key={nm}
            className={`${styles.chip} ${styles.on} ${styles.staged}`}
            title="will be created when you submit"
            onClick={() => setStaged((s) => s.filter((n) => n !== nm))}
          >
            {nm} ×
          </button>
        ))}
        <input
          className={styles.addField}
          placeholder="+ new field"
          value={newField}
          onChange={(e) => setNewField(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addField();
            }
          }}
          onBlur={addField}
        />
      </div>
      {staged.length > 0 && (
        <div className={styles.sub}>Dashed fields are new — created when you submit.</div>
      )}

      <div className={styles.actions}>
        <button className={styles.btn} onClick={submit} disabled={busy}>
          {busy ? 'Creating…' : 'Create my profile'}
        </button>
        {hint && <div className={`${styles.sub} ${styles.bad}`}>{hint}</div>}
      </div>
    </div>
  );
}
