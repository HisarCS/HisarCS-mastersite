'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthUser, getMyProfile } from '@/lib/data/auth';
import { listFields, createField } from '@/lib/data/profile';
import { listMembers } from '@/lib/data/members';
import { uploadResearchFile, deleteResearchFile } from '@/lib/data/storage';
import {
  addResearchLink,
  addResearchMember,
  deleteResearchEntry,
  deleteResearchLink,
  getResearchEntry,
  removeResearchMember,
  updateResearchPage,
  researchFileUrl,
  setExternalAuthors,
  setResearchPublished,
  syncResearchFields,
  updateResearchEntry,
  updateResearchMemberRole,
} from '@/lib/data/researchEntries';
import type { Field, MemberCard, ResearchEntry, ResearchExternalAuthor } from '@/lib/domain/types';
import type { ResearchPage } from '@/lib/domain/blocks';
import { PageBuilder, pageProblems } from './blocks/PageBuilder';
import { MemberPicker } from './member/MemberPicker';
import { SiteHeader } from './SiteHeader';
import { Unavailable } from './Unavailable';
import styles from './ResearchEditor.module.css';

/** mirrors the DB CHECK on research.public_id */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type State =
  | { status: 'loading' }
  | { status: 'ok'; entry: ResearchEntry }
  | { status: 'missing' }
  | { status: 'denied' };

/**
 * Editor for a member-created research entry (`/research/edit?id=<public_id>`).
 * RLS is the real gate — `is_project_editor()` refuses writes from non-members —
 * so this only mirrors that for honest UX. Covers title, description, interest
 * tags, external links, files (images/PDFs), co-members, publish state, and
 * deletion.
 */
export function ResearchEditor({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [page, setPage] = useState<ResearchPage | null>(null);
  const [pageHint, setPageHint] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newField, setNewField] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [hint, setHint] = useState('');
  const [pubHint, setPubHint] = useState('');
  const [fileHint, setFileHint] = useState('');
  const [memberHint, setMemberHint] = useState('');
  const [people, setPeople] = useState<MemberCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
    setSlug(entry.publicId);
    setPage(entry.page);
    setSelected(new Set(entry.fieldIds));
    setState(amEditor ? { status: 'ok', entry } : { status: 'denied' });
  }, [id]);

  useEffect(() => {
    void load();
    void listFields().then(setFields);
    void listMembers().then(setPeople); // candidates for the co-member picker
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
    const nextSlug = slug.trim();
    if (!SLUG_RE.test(nextSlug)) {
      setHint('✕ the URL may only use lowercase letters, numbers and dashes');
      return;
    }
    setBusy(true);
    setHint('saving…');
    const err = await updateResearchEntry(entry.dbId, {
      title: title.trim(),
      description: description.trim(),
      publicId: nextSlug,
    });
    if (err) {
      setBusy(false);
      setHint(`✕ ${err}`);
      return;
    }
    await syncResearchFields(entry.dbId, entry.fieldIds, [...selected]);
    setBusy(false);
    // the URL key is what this page is addressed by — follow it when it changes
    if (nextSlug !== entry.publicId) {
      router.replace(`/research/edit?id=${encodeURIComponent(nextSlug)}`);
      return;
    }
    await load();
    setHint('Saved ✓');
    window.setTimeout(() => setHint(''), 2500);
  };

  const publish = async (next: boolean) => {
    setBusy(true);
    setPubHint(next ? 'publishing…' : 'unpublishing…');
    const err = await setResearchPublished(entry.dbId, next);
    setBusy(false);
    if (err) {
      setPubHint(`✕ ${err}`);
      return;
    }
    await load();
    setPubHint(next ? '✓ it’s live' : '✓ back to draft');
  };

  const savePage = async () => {
    const problems = pageProblems(page);
    if (problems.length) {
      setPageHint(`✕ ${problems[0]}`);
      return;
    }
    setBusy(true);
    setPageHint('saving…');
    // no blocks = no composed page: store null so readers see the Description
    const err = await updateResearchPage(entry.dbId, page && page.blocks.length ? page : null);
    setBusy(false);
    if (err) {
      setPageHint(`✕ ${err}`);
      return;
    }
    setPageHint('Saved ✓');
    window.setTimeout(() => setPageHint(''), 2500);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFileHint('uploading…');
    const { error } = await uploadResearchFile(entry.dbId, file, entry.files.length);
    setBusy(false);
    if (error) {
      setFileHint(`✕ ${error}`);
      return;
    }
    setFileHint('✓ uploaded');
    await load();
  };

  const removeFile = async (fileId: string, storagePath: string) => {
    setBusy(true);
    const err = await deleteResearchFile(fileId, storagePath);
    setBusy(false);
    if (err) {
      setFileHint(`✕ ${err}`);
      return;
    }
    setFileHint('');
    await load();
  };

  const addMember = async (personId: string, role: string) => {
    setBusy(true);
    setMemberHint('adding…');
    const err = await addResearchMember(entry.dbId, personId, role);
    setBusy(false);
    if (err) {
      setMemberHint(`✕ ${err}`);
      return;
    }
    setMemberHint('');
    await load();
  };

  /** Save a member's role on blur — skipped when nothing changed. */
  const saveRole = async (personId: string, role: string, before: string) => {
    if (role.trim() === before.trim()) return;
    setBusy(true);
    const err = await updateResearchMemberRole(entry.dbId, personId, role.trim());
    setBusy(false);
    setMemberHint(err ? `✕ ${err}` : '✓ role saved');
    await load();
  };

  // --- outside collaborators: a jsonb array on the research row, rewritten whole ---
  const writeExternals = async (next: ResearchExternalAuthor[]) => {
    setBusy(true);
    const err = await setExternalAuthors(entry.dbId, next);
    setBusy(false);
    if (err) {
      setMemberHint(`✕ ${err}`);
      return;
    }
    setMemberHint('');
    await load();
  };

  const addExternal = async (name: string, role: string) => {
    if (entry.externalAuthors.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setMemberHint('✕ that collaborator is already credited');
      return;
    }
    await writeExternals([...entry.externalAuthors, role ? { name, role } : { name }]);
  };

  const saveExternalRole = async (index: number, role: string) => {
    const current = entry.externalAuthors[index];
    if (!current || (current.role ?? '') === role.trim()) return;
    const next = entry.externalAuthors.map((a, i) =>
      i === index ? { name: a.name, ...(role.trim() ? { role: role.trim() } : {}) } : a,
    );
    await writeExternals(next);
  };

  const removeExternal = async (index: number) =>
    writeExternals(entry.externalAuthors.filter((_, i) => i !== index));

  const removeMember = async (personId: string) => {
    // the DB deletes the entry when its last member leaves — never offer that here
    if (entry.members.length < 2) {
      setMemberHint('✕ the last member can’t be removed — delete the research instead');
      return;
    }
    setBusy(true);
    const err = await removeResearchMember(entry.dbId, personId);
    setBusy(false);
    if (err) {
      setMemberHint(`✕ ${err}`);
      return;
    }
    setMemberHint('');
    await load();
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

        {/* publish state, explained — mirrors the profile dashboard's notice */}
        <div className={`${styles.notice} ${entry.published ? styles.liveNote : ''}`}>
          {entry.published ? (
            <>
              <div>
                This research is <strong>live</strong> — it&apos;s listed on the Research page and
                anyone can read it.
              </div>
              <div className={styles.noticeRow}>
                <button className={styles.btnGhost} onClick={() => publish(false)} disabled={busy}>
                  Unpublish
                </button>
                <Link
                  className={styles.btnGhost}
                  href={`/research?id=${encodeURIComponent(entry.publicId)}`}
                >
                  View public page
                </Link>
                <span className={styles.sub}>{pubHint}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                This research is a <strong>draft</strong> — only its members can see it. Publish it
                to list it on the Research page.
              </div>
              <div className={styles.noticeRow}>
                <button className={styles.btn} onClick={() => publish(true)} disabled={busy}>
                  Publish
                </button>
                <span className={styles.sub}>{pubHint}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.panel}>
          <label className={styles.f}>TITLE</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

          <label className={styles.f}>DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this research about?"
          />

          <label className={styles.f}>
            PUBLIC URL <span className={styles.lock}>must be unique</span>
          </label>
          <div className={styles.slugRow}>
            <span className={styles.sub}>/research?id=</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="lowercase-with-dashes"
            />
          </div>
          <div
            className={`${styles.sub} ${slug.trim() && !SLUG_RE.test(slug.trim()) ? styles.bad : ''}`}
          >
            {slug.trim() && !SLUG_RE.test(slug.trim())
              ? '\u2715 lowercase letters, numbers and dashes only'
              : 'Changing this changes the public link \u2014 old links stop working.'}
          </div>

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
            <span className={`${styles.sub} ${hint.startsWith('✕') ? styles.bad : styles.ok}`}>
              {hint}
            </span>
          </div>
        </div>

        <div className={styles.panel}>
          <h2>Page</h2>
          <PageBuilder
            page={page}
            files={entry.files}
            disabled={busy}
            onChange={(p) => {
              setPage(p);
              setPageHint('');
            }}
          />
          <div className={styles.actions}>
            <button className={styles.btn} onClick={savePage} disabled={busy}>
              {busy ? 'Saving…' : 'Save page'}
            </button>
            <span className={`${styles.sub} ${pageHint.startsWith('✕') ? styles.bad : styles.ok}`}>
              {pageHint}
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
          <h2>Files</h2>
          <p className={styles.sub}>
            Images (JPEG/PNG/WebP, up to 15 MB — optimized on upload) and PDFs (up to 10 MB). They
            appear on the public page.
          </p>
          {entry.files.length > 0 && (
            <div className={styles.files}>
              {entry.files.map((f) => {
                const url = researchFileUrl(f.storagePath);
                const label = f.caption || f.storagePath.split('/').pop() || 'file';
                return (
                  <div key={f.id} className={styles.fileRow}>
                    {f.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className={styles.fileThumb} loading="lazy" />
                    ) : (
                      <div className={styles.fileThumb}>PDF</div>
                    )}
                    <a
                      className={styles.fileName}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label}
                    </a>
                    <button
                      className={styles.remove}
                      onClick={() => removeFile(f.id, f.storagePath)}
                      disabled={busy}
                      aria-label={`Remove ${label}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.btnGhost}
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              Upload image or PDF
            </button>
            <span className={`${styles.sub} ${fileHint.startsWith('✕') ? styles.bad : styles.ok}`}>
              {fileHint}
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = ''; // let the same file be picked again
            }}
          />
        </div>

        <div className={styles.panel}>
          <h2>Members</h2>
          <p className={styles.sub}>
            Everyone here has equal rights: any member can edit this research, change anyone&rsquo;s
            role, and add or remove members. Removing the last member deletes the entry, so at least
            one must remain. Names that link to a profile belong to ideaLab members; anyone else is
            credited here but has no editing rights.
          </p>

          {entry.members.map((m) => (
            <div key={m.id} className={styles.memberRow}>
              <Link
                className={`${styles.ll} ${styles.memberLink}`}
                href={`/person?id=${encodeURIComponent(m.publicId)}`}
              >
                {m.name}
              </Link>
              <input
                className={styles.roleInput}
                defaultValue={m.role}
                placeholder="Role"
                disabled={busy}
                onBlur={(e) => void saveRole(m.id, e.target.value, m.role)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
              <button
                className={styles.remove}
                onClick={() => removeMember(m.id)}
                disabled={busy || entry.members.length < 2}
                title={
                  entry.members.length < 2
                    ? 'the last member can\u2019t be removed'
                    : `Remove ${m.name}`
                }
                aria-label={`Remove ${m.name}`}
              >
                &#10005;
              </button>
            </div>
          ))}

          {entry.externalAuthors.map((a, i) => (
            <div key={`${a.name}-${i}`} className={styles.memberRow}>
              {/* no account here → plain text; the hyperlink above is what
                  distinguishes a member with a profile */}
              <span className={styles.ll}>{a.name}</span>
              <input
                className={styles.roleInput}
                defaultValue={a.role ?? ''}
                placeholder="Role"
                disabled={busy}
                onBlur={(e) => void saveExternalRole(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
              <button
                className={styles.remove}
                onClick={() => removeExternal(i)}
                disabled={busy}
                aria-label={`Remove ${a.name}`}
              >
                &#10005;
              </button>
            </div>
          ))}

          <MemberPicker
            people={people.filter((p) => !entry.members.some((m) => m.id === p.id))}
            onPickMember={(personId, role) => void addMember(personId, role)}
            onAddExternal={(name, role) => void addExternal(name, role)}
            disabled={busy}
          />
          {memberHint && (
            <div className={`${styles.sub} ${memberHint.startsWith('\u2715') ? styles.bad : ''}`}>
              {memberHint}
            </div>
          )}
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
