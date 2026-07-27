'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthUser, getMyProfile } from '@/lib/data/auth';
import { listFields, createField } from '@/lib/data/profile';
import {
  addResearchLink,
  deleteResearchEntry,
  deleteResearchLink,
  getResearchEntry,
  setResearchPublished,
  syncResearchFields,
  updateResearchEntry,
} from '@/lib/data/researchEntries';
import type { Field, ResearchEntry } from '@/lib/domain/types';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './ResearchEditor.module.css';

type State =
  | { status: 'loading' }
  | { status: 'ok'; entry: ResearchEntry }
  | { status: 'missing' }
  | { status: 'denied' };

/**
 * Editor for a member-created research entry (`/research/edit?id=<public_id>`).
 * RLS is the real gate — `is_project_editor()` refuses writes from non-members —
 * so this only mirrors that for honest UX. Covers title, description, interest
 * tags, external links, publish state, and deletion. Co-member management and
 * file uploads are not built yet.
 */
export function ResearchEditor({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newField, setNewField] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const entry = await getResearchEntry(id);
    if (!entry) {
      setState({ status: 'missing' });
      return;
    }
    // editor check: am I on this entry's member list?
    const user = await getAuthUser();
    const me = user ? await getMyProfile(user.userId) : null;
    const amEditor = !!me && entry.members.some((m) => m.publicId === me.publicId);
    setTitle(entry.title);
    setDescription(entry.description);
    setSelected(new Set(entry.fieldIds));
    setState(amEditor ? { status: 'ok', entry } : { status: 'denied' });
  }, [id]);

  useEffect(() => {
    void load();
    void listFields().then(setFields);
  }, [load]);

  useEffect(() => {
    if (state.status === 'ok') document.title = `Edit ${state.entry.title} — ideaLab`;
  }, [state]);

  if (state.status === 'loading') {
    return (
      <>
        <SiteHeader />
        <main className={styles.main} aria-busy="true">
          <div className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
          </div>
        </main>
      </>
    );
  }

  if (state.status === 'missing') {
    return (
      <Unavailable
        heading="This research isn’t available"
        detail="It may have been removed, or the link may be mistyped."
      />
    );
  }

  if (state.status === 'denied') {
    return (
      <Unavailable
        heading="You can’t edit this research"
        detail="Only people on this entry’s member list can edit it."
      />
    );
  }

  const entry = state.entry;

  const toggle = (fid: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(fid)) n.delete(fid);
      else n.add(fid);
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
    const f = await createField(nm);
    if (f) {
      setFields((cur) => [...cur, f]);
      setSelected((s) => new Set(s).add(f.id));
    }
  };

  const save = async () => {
    if (!title.trim()) {
      setHint('✕ a title is required');
      return;
    }
    setBusy(true);
    setHint('saving…');
    const err = await updateResearchEntry(entry.dbId, {
      title: title.trim(),
      description: description.trim(),
    });
    if (err) {
      setBusy(false);
      setHint(`✕ ${err}`);
      return;
    }
    await syncResearchFields(entry.dbId, entry.fieldIds, [...selected]);
    await load();
    setBusy(false);
    setHint('Saved ✓');
    window.setTimeout(() => setHint(''), 2500);
  };

  const publish = async (next: boolean) => {
    setBusy(true);
    const err = await setResearchPublished(entry.dbId, next);
    setBusy(false);
    if (err) {
      setHint(`✕ ${err}`);
      return;
    }
    await load();
    setHint(next ? '✓ published' : '✓ back to draft');
  };

  const addLink = async () => {
    const label = linkLabel.trim();
    const url = linkUrl.trim();
    if (!label || !url) {
      setHint('✕ a link needs both a label and a URL');
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      setHint('✕ links must start with http:// or https://');
      return;
    }
    setBusy(true);
    const err = await addResearchLink(entry.dbId, label, url, entry.links.length);
    setBusy(false);
    if (err) {
      setHint(`✕ ${err}`);
      return;
    }
    setLinkLabel('');
    setLinkUrl('');
    setHint('');
    await load();
  };

  const removeLink = async (linkId: string) => {
    setBusy(true);
    await deleteResearchLink(linkId);
    setBusy(false);
    await load();
  };

  const destroy = async () => {
    setBusy(true);
    const err = await deleteResearchEntry(entry.dbId);
    if (err) {
      setBusy(false);
      setHint(`✕ ${err}`);
      return;
    }
    router.push('/member'); // router handles basePath; a raw href would 404
  };

  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.topRow}>
          <Link href="/member" className={styles.back}>
            ← My research
          </Link>
          <span className={`${styles.badge} ${entry.published ? styles.live : styles.draft}`}>
            {entry.published ? 'Published' : 'Draft'}
          </span>
        </div>

        <h1 className={styles.h1}>Edit research</h1>
        <p className={styles.sub}>
          Public URL: <code>/research?id={entry.publicId}</code>
          {entry.published && (
            <>
              {' · '}
              <Link href={`/research?id=${encodeURIComponent(entry.publicId)}`}>view page</Link>
            </>
          )}
        </p>

        <div className={styles.panel}>
          <label className={styles.f}>TITLE</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

          <label className={styles.f}>DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this research about?"
          />

          <label className={styles.f}>FIELDS</label>
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
            <button
              className={styles.btnGhost}
              onClick={() => publish(!entry.published)}
              disabled={busy}
            >
              {entry.published ? 'Unpublish' : 'Publish'}
            </button>
            <span className={`${styles.sub} ${hint.startsWith('✕') ? styles.bad : styles.ok}`}>
              {hint}
            </span>
          </div>
        </div>

        <div className={styles.panel}>
          <h2>Links</h2>
          {entry.links.length === 0 ? (
            <div className={styles.sub}>No links yet.</div>
          ) : (
            entry.links.map((l) => (
              <div key={l.id} className={styles.linkRow}>
                <span className={styles.ll}>{l.label}</span>
                <span className={styles.lu}>{l.url.replace(/^https?:\/\//, '')}</span>
                <button
                  className={styles.remove}
                  onClick={() => removeLink(l.id)}
                  disabled={busy}
                  aria-label={`Remove ${l.label}`}
                >
                  ✕
                </button>
              </div>
            ))
          )}
          <div className={styles.linkAdd}>
            <input
              placeholder="Label (e.g. GitHub repo)"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
            />
            <input
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <button className={styles.btnGhost} onClick={addLink} disabled={busy}>
              Add link
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <h2>Members</h2>
          <div className={styles.sub}>
            {entry.members.map((m) => `${m.name} (${m.role})`).join(', ') || 'None'}
            {' — '}adding or removing co-members isn’t built yet.
          </div>
        </div>

        <div className={`${styles.panel} ${styles.danger}`}>
          <h2>Delete</h2>
          <p className={styles.sub}>
            Permanently deletes this research entry and its tags, links, and files. This cannot be
            undone.
          </p>
          {confirmDelete ? (
            <div className={styles.actions}>
              <button className={styles.btnDanger} onClick={destroy} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete forever'}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button className={styles.btnDanger} onClick={() => setConfirmDelete(true)}>
              Delete this research
            </button>
          )}
        </div>
      </main>
    </>
  );
}
