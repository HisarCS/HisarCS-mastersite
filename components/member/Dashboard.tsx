'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  createField,
  isPublicIdAvailable,
  listFields,
  listMyResearch,
  setAvatarColor,
  setPublished,
  syncPersonFields,
  updateMyProfile,
} from '@/lib/data/profile';
import { setAvatarUrl, uploadAvatar, uploadResume } from '@/lib/data/storage';
import { DangerZone } from './DangerZone';
import { cleanYearInput, gradYearMax, GRAD_YEAR_MIN, isValidGradYear } from '@/lib/util/year';
import { thumbUrl } from '@/lib/util/media';
import { safeUrl } from '@/lib/util/html';
import type { Field, MyProfile, MyResearchSummary } from '@/lib/domain/types';
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
 * Dashboard (4c/4d) — edit profile, publish toggle, interest fields, avatar
 * (color / upload / GitHub import), resume upload, research list. Account
 * deletion is 4e. Mirrors member.html fillDashboard/saveProfile/setPublished/
 * loadResearch/uploadAvatar/uploadResume/importGithubAvatar.
 */
export function Dashboard({
  profile,
  onProfileChange,
  userId,
  ghLogin,
  ghAvatarUrl,
}: {
  profile: MyProfile;
  onProfileChange: (p: MyProfile) => void;
  userId: string;
  ghLogin: string;
  ghAvatarUrl: string | null;
}) {
  const [name, setName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio);
  const [resume, setResume] = useState(profile.resumeUrl ?? '');
  const [slug, setSlug] = useState(profile.publicId);
  const [year, setYear] = useState(profile.gradYear ? String(profile.gradYear) : '');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(profile.fieldIds));
  const [newField, setNewField] = useState('');
  const [research, setResearch] = useState<MyResearchSummary[]>([]);
  const [saveHint, setSaveHint] = useState('');
  const [pubHint, setPubHint] = useState('');
  const [slugHint, setSlugHint] = useState('');
  const [avatarHint, setAvatarHint] = useState('');
  const [resumeHint, setResumeHint] = useState('');
  const [busy, setBusy] = useState(false);
  const slugTimer = useRef<number | undefined>(undefined);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listFields().then(setFields);
    void listMyResearch(profile.id).then(setResearch);
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

  const onAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    setAvatarHint('optimizing…');
    const { url, error } = await uploadAvatar(userId, profile.id, file);
    if (error || !url) {
      setAvatarHint(`✕ ${error ?? 'upload failed'}`);
      return;
    }
    onProfileChange({ ...profile, avatarUrl: url });
    setAvatarHint('✓ avatar saved');
  };

  const importGithub = async () => {
    const url = ghAvatarUrl || (ghLogin ? `https://github.com/${ghLogin}.png?size=240` : '');
    if (!url) {
      setAvatarHint('✕ no GitHub avatar to import');
      return;
    }
    setAvatarHint('importing…');
    const err = await setAvatarUrl(profile.id, url);
    if (err) {
      setAvatarHint(`✕ ${err}`);
      return;
    }
    onProfileChange({ ...profile, avatarUrl: url });
    setAvatarHint('✓ imported your GitHub avatar');
  };

  const resetToInitials = async () => {
    // clearing the avatar falls back to the initials tile (keeps the color)
    const ok = await setAvatarColor(profile.id, profile.avatarColor || PALETTE[1]);
    if (ok) {
      onProfileChange({
        ...profile,
        avatarUrl: null,
        avatarColor: profile.avatarColor || PALETTE[1],
      });
      setAvatarHint('✓ back to your initials tile');
    }
  };

  const onResumeFile = async (file: File | undefined) => {
    if (!file) return;
    setResumeHint('uploading…');
    const { url, error } = await uploadResume(userId, profile.id, file);
    if (error || !url) {
      setResumeHint(`✕ ${error ?? 'upload failed'}`);
      return;
    }
    setResume(url);
    onProfileChange({ ...profile, resumeUrl: url });
    setResumeHint('✓ resume uploaded');
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
            <div className={styles.avatarBtns}>
              <button className={styles.btnGhost} onClick={() => avatarInput.current?.click()}>
                Upload photo
              </button>
              <button className={styles.btnGhost} onClick={importGithub}>
                Use GitHub avatar
              </button>
              {profile.avatarUrl && (
                <button className={styles.btnGhost} onClick={resetToInitials}>
                  Reset to initials
                </button>
              )}
            </div>
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void onAvatarFile(e.target.files?.[0])}
            />
            <div className={styles.sub}>
              …or pick a tile color (shows behind your initials on the homepage):
            </div>
            <div className={styles.swatches}>
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`${styles.swatch} ${!profile.avatarUrl && profile.avatarColor === c ? styles.on : ''}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => pickColor(c)}
                />
              ))}
            </div>
            {avatarHint && (
              <div
                className={`${styles.sub} ${avatarHint.startsWith('✕') ? styles.bad : styles.ok}`}
              >
                {avatarHint}
              </div>
            )}
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

        <label className={styles.f}>RESUME</label>
        <input
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="https://… or upload a PDF"
        />
        <div className={styles.avatarBtns}>
          <button className={styles.btnGhost} onClick={() => resumeInput.current?.click()}>
            Upload PDF
          </button>
          {resume && (
            <a
              className={styles.btnGhost}
              href={safeUrl(resume)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View current
            </a>
          )}
          <span className={`${styles.sub} ${resumeHint.startsWith('✕') ? styles.bad : styles.ok}`}>
            {resumeHint}
          </span>
        </div>
        <input
          ref={resumeInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => void onResumeFile(e.target.files?.[0])}
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
        <h2>My research</h2>
        {research.length === 0 ? (
          <div className={styles.sub}>No research yet — start one below.</div>
        ) : (
          research.map((p) => (
            <Link
              key={p.publicId}
              className={styles.proj}
              href={`/research?id=${encodeURIComponent(p.publicId)}`}
            >
              <div className={styles.pav}>{initialsOf(p.title)}</div>
              <div className={styles.pt}>{p.title}</div>
              <div className={styles.spacer} />
              <span className={`${styles.badge} ${p.isPublished ? styles.live : styles.draft}`}>
                {p.isPublished ? 'Published' : 'Draft'}
              </span>
            </Link>
          ))
        )}
      </div>

      <DangerZone userId={userId} handle={profile.githubUsername ?? ghLogin} />
    </>
  );
}
