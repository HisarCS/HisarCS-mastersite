'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createField,
  isPublicIdAvailable,
  listFields,
  listMyProjects,
  setAvatarColor,
  setPublished,
  syncPersonFields,
  updateMyProfile,
} from '@/lib/data/profile';
import { cleanYearInput, gradYearMax, GRAD_YEAR_MIN, isValidGradYear } from '@/lib/util/year';
import { thumbUrl } from '@/lib/util/media';
import type { Field, MyProfile, MyProjectSummary } from '@/lib/domain/types';
import styles from './Dashboard.module.css';

const PALETTE = ['#e8542f', '#2f6fe8', '#28a06d', '#c4a11f', '#9048c8', '#d2447e'];
const initialsOf = (s: string) =>
  (s || 'M K')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * Dashboard (4c) — edit profile, publish toggle, interest fields, avatar color,
 * projects list. Avatar/resume UPLOAD is 4d; account deletion is 4e. Mirrors
 * member.html fillDashboard/saveProfile/setPublished/loadProjects.
 */
export function Dashboard({
  profile,
  onProfileChange,
}: {
  profile: MyProfile;
  onProfileChange: (p: MyProfile) => void;
}) {
  const [name, setName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio);
  const [resume, setResume] = useState(profile.resumeUrl ?? '');
  const [slug, setSlug] = useState(profile.publicId);
  const [year, setYear] = useState(profile.gradYear ? String(profile.gradYear) : '');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(profile.fieldIds));
  const [newField, setNewField] = useState('');
  const [projects, setProjects] = useState<MyProjectSummary[]>([]);
  const [saveHint, setSaveHint] = useState('');
  const [pubHint, setPubHint] = useState('');
  const [slugHint, setSlugHint] = useState('');
  const [busy, setBusy] = useState(false);
  const slugTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    void listFields().then(setFields);
    void listMyProjects(profile.id).then(setProjects);
  }, [profile.id]);

  const yearNum = parseInt(year, 10);
  const yearValid = year.length === 4 && isValidGradYear(yearNum);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const addField = async () => {
    const nm = newField.replace(/\s+/g, ' ').trim();
    setNewField('');
    if (!nm) return;
    const existing = fields.find((f) => f.name.toLowerCase() === nm.toLowerCase());
    if (existing) {
      setSelected((s) => new Set(s).add(existing.id));
      return;
    }
    const f = await createField(nm); // dashboard creates immediately
    if (f) {
      setFields((cur) => [...cur, f]);
      setSelected((s) => new Set(s).add(f.id));
    }
  };

  const onSlug = (v: string) => {
    setSlug(v);
    setSlugHint('');
    window.clearTimeout(slugTimer.current);
    if (v === profile.publicId) {
      setSlugHint('✓ this URL is yours');
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) {
      setSlugHint('✕ lowercase letters, numbers and dashes only');
      return;
    }
    slugTimer.current = window.setTimeout(async () => {
      const free = await isPublicIdAvailable(v);
      setSlugHint(free ? '✓ available' : '✕ already taken');
    }, 300);
  };

  const publish = async (next: boolean) => {
    if (next && !profile.gradYear && !yearNum) {
      setPubHint('add your graduation year and save first');
      return;
    }
    setBusy(true);
    setPubHint(next ? 'publishing…' : 'unpublishing…');
    const { profile: updated, error } = await setPublished(profile.id, next);
    setBusy(false);
    if (error || !updated) {
      setPubHint(`✕ ${error ?? 'failed'}`);
      return;
    }
    onProfileChange(updated);
    setPubHint(next ? '✓ your profile is live' : '✓ back to draft');
  };

  const save = async () => {
    if (!yearValid) {
      setSaveHint('✕ fix the graduation year');
      return;
    }
    setBusy(true);
    setSaveHint('saving…');
    const { profile: updated, error } = await updateMyProfile(profile.id, {
      fullName: name.trim(),
      bio: bio.trim(),
      resumeUrl: resume.trim(),
      publicId: slug.trim(),
      gradYear: yearNum,
    });
    if (error || !updated) {
      setBusy(false);
      setSaveHint(`✕ ${error ?? 'save failed'}`);
      return;
    }
    await syncPersonFields(profile.id, profile.fieldIds, [...selected]);
    setBusy(false);
    onProfileChange({ ...updated, fieldIds: [...selected] });
    setSaveHint('Saved ✓');
    window.setTimeout(() => setSaveHint(''), 2500);
  };

  const pickColor = async (c: string) => {
    const ok = await setAvatarColor(profile.id, c);
    if (ok) onProfileChange({ ...profile, avatarUrl: null, avatarColor: c });
  };

  const live = profile.isPublished;
  const initials = useMemo(() => initialsOf(name || profile.fullName), [name, profile.fullName]);

  return (
    <>
      <div className={`${styles.notice} ${live ? styles.liveNote : ''}`}>
        {live ? (
          <>
            <div>
              Your profile is <strong>live</strong> — it has a pixel on the homepage.
            </div>
            <div className={styles.noticeRow}>
              <button className={styles.btnGhost} onClick={() => publish(false)} disabled={busy}>
                Unpublish
              </button>
              <span className={styles.sub}>{pubHint}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              Your profile is a <strong>draft</strong> — only you can see it. Publish it to take
              your pixel on the homepage (needs a graduation year).
            </div>
            <div className={styles.noticeRow}>
              <button className={styles.btn} onClick={() => publish(true)} disabled={busy}>
                Publish my profile
              </button>
              <span className={styles.sub}>{pubHint}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.panel}>
        <h2>Profile</h2>
        <div className={styles.avatarRow}>
          <div
            className={styles.avatarBig}
            style={{ background: profile.avatarColor || '#2f6fe8' }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl(profile.avatarUrl) ?? ''} alt="" />
            ) : (
              initials
            )}
          </div>
          <div>
            <div className={styles.sub}>Tile color (avatar upload arrives in 4d):</div>
            <div className={styles.swatches}>
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`${styles.swatch} ${profile.avatarColor === c ? styles.on : ''}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => pickColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <label className={styles.f}>FULL NAME</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

        <label className={styles.f}>BIO</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you make?"
        />

        <label className={styles.f}>RESUME URL</label>
        <input
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="https://… (PDF upload arrives in 4d)"
        />

        <label className={styles.f}>
          GITHUB USERNAME <span className={styles.lock}>synced from your login</span>
        </label>
        <input value={profile.githubUsername ?? ''} readOnly />

        <label className={styles.f}>
          PROFILE URL <span className={styles.lock}>must be unique</span>
        </label>
        <div className={styles.slugRow}>
          <span className={styles.sub}>…/person?id=</span>
          <input
            value={slug}
            onChange={(e) => onSlug(e.target.value)}
            placeholder="your-profile-url"
          />
        </div>
        <div className={styles.sub}>{slugHint}</div>

        <label className={styles.f}>GRADUATION YEAR</label>
        <input
          inputMode="numeric"
          maxLength={4}
          value={year}
          onChange={(e) => setYear(cleanYearInput(e.target.value))}
          placeholder="2008 and beyond"
        />
        <div className={`${styles.sub} ${year.length === 4 && !yearValid ? styles.bad : ''}`}>
          {year.length === 4 && !yearValid
            ? `✕ must be between ${GRAD_YEAR_MIN} and ${gradYearMax()}`
            : 'Your student/alumni status follows this year automatically.'}
        </div>

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
          <input
            className={styles.addField}
            placeholder="+ new field"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addField();
              }
            }}
            onBlur={() => void addField()}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.btn} onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <span className={`${styles.sub} ${saveHint.startsWith('✕') ? styles.bad : styles.ok}`}>
            {saveHint}
          </span>
        </div>
      </div>

      <div className={styles.panel}>
        <h2>My projects</h2>
        {projects.length === 0 ? (
          <div className={styles.sub}>No projects yet — start one below.</div>
        ) : (
          projects.map((p) => (
            <a
              key={p.publicId}
              className={styles.proj}
              href={`/project?id=${encodeURIComponent(p.publicId)}`}
            >
              <div className={styles.pav}>{initialsOf(p.title)}</div>
              <div className={styles.pt}>{p.title}</div>
              <div className={styles.spacer} />
              <span className={`${styles.badge} ${p.isPublished ? styles.live : styles.draft}`}>
                {p.isPublished ? 'Published' : 'Draft'}
              </span>
            </a>
          ))
        )}
      </div>
    </>
  );
}
