'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAreaTag,
  listAreaRows,
  moveAreaTag,
  removeAreaTag,
  renameArea,
  type AreaRow,
} from '@/lib/data/admin';
import { normalizeArea, normalizeTag } from '@/lib/domain/admin';
import { invalidateInterestTable } from '../useInterestTable';
import styles from './Admin.module.css';

/**
 * The research interest areas (interest_areas): which tags fall under which
 * umbrella on /research. Every change is saved as it's made.
 */
export function InterestAreasEditor() {
  const [rows, setRows] = useState<AreaRow[] | null>();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [newArea, setNewArea] = useState({ area: '', tag: '' });

  const load = useCallback(async () => setRows(await listAreaRows()), []);
  useEffect(() => {
    void load();
  }, [load]);

  /** areas in display order, each with its sort and tags */
  const areas = useMemo(() => {
    const by = new Map<string, { sort: number; tags: string[] }>();
    for (const r of rows ?? []) {
      const a = by.get(r.area) ?? { sort: r.sort, tags: [] };
      a.tags.push(r.tag);
      by.set(r.area, a);
    }
    return [...by.entries()]
      .sort(([an, a], [bn, b]) => a.sort - b.sort || an.localeCompare(bn))
      .map(([name, a]) => ({ name, ...a, tags: a.tags.sort() }));
  }, [rows]);

  const save = async (run: () => Promise<string | null>) => {
    const err = await run();
    setError(err);
    invalidateInterestTable();
    await load();
    return !err;
  };

  const addTag = async (area: string, sort: number) => {
    const t = normalizeTag(drafts[area] ?? '');
    if (t.error !== undefined) return setError(t.error);
    if (areas.find((a) => a.name === area)?.tags.includes(t.ok))
      return setError(`"${t.ok}" is already in ${area}`);
    if (await save(() => addAreaTag({ area, tag: t.ok, sort })))
      setDrafts((d) => ({ ...d, [area]: '' }));
  };

  const createArea = async () => {
    const a = normalizeArea(newArea.area);
    if (a.error !== undefined) return setError(a.error);
    const t = normalizeTag(newArea.tag);
    if (t.error !== undefined) return setError(t.error);
    if (areas.some((x) => x.name === a.ok))
      return setError(`There's already an area called ${a.ok}`);
    const sort = Math.max(-1, ...areas.map((x) => x.sort)) + 1;
    if (await save(() => addAreaTag({ area: a.ok, tag: t.ok, sort })))
      setNewArea({ area: '', tag: '' });
  };

  if (rows === undefined) return <p className={styles.muted}>Loading…</p>;
  if (rows === null) return <p className={styles.error}>Couldn&apos;t load the interest areas.</p>;

  return (
    <div className={styles.stack}>
      <p className={styles.muted}>
        /research groups entries by these areas. A tag can sit in more than one; a tag in none shows
        up as its own area. Changes apply to visitors on their next page load.
      </p>
      {error && <p className={styles.error}>{error}</p>}

      {areas.map((a) => (
        <section key={a.name} className={styles.area} aria-label={`Area ${a.name}`}>
          <div className={styles.areaHead}>
            {renaming?.from === a.name ? (
              <form
                className={styles.inline}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = normalizeArea(renaming.to);
                  if (n.error !== undefined) return setError(n.error);
                  void save(() => renameArea(a.name, n.ok)).then((ok) => ok && setRenaming(null));
                }}
              >
                <input
                  className={styles.input}
                  value={renaming.to}
                  onChange={(e) => setRenaming({ from: a.name, to: e.target.value })}
                  aria-label={`New name for ${a.name}`}
                  autoFocus
                />
                <button type="submit" className={styles.primary}>
                  Save
                </button>
                <button type="button" className={styles.ghost} onClick={() => setRenaming(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <h2 className={styles.h2}>{a.name}</h2>
                <button
                  type="button"
                  className={styles.link}
                  aria-label={`Rename ${a.name}`}
                  onClick={() => setRenaming({ from: a.name, to: a.name })}
                >
                  Rename
                </button>
              </>
            )}
          </div>
          <ul className={styles.tagList}>
            {a.tags.map((t) => (
              <li key={t} className={styles.tag}>
                <span>{t}</span>
                <select
                  aria-label={`Move ${t} to another area`}
                  value=""
                  onChange={(e) => {
                    const to = areas.find((x) => x.name === e.target.value);
                    if (to) void save(() => moveAreaTag(t, a.name, to.name, to.sort));
                  }}
                >
                  <option value="">Move…</option>
                  {areas
                    .filter((x) => x.name !== a.name && !x.tags.includes(t))
                    .map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className={styles.x}
                  aria-label={`Remove ${t} from ${a.name}`}
                  onClick={() => void save(() => removeAreaTag(a.name, t))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            className={styles.inline}
            onSubmit={(e) => {
              e.preventDefault();
              void addTag(a.name, a.sort);
            }}
          >
            <input
              className={styles.input}
              value={drafts[a.name] ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [a.name]: e.target.value }))}
              placeholder="add a tag"
              aria-label={`Tag to add to ${a.name}`}
            />
            <button type="submit" className={styles.ghost}>
              Add
            </button>
          </form>
        </section>
      ))}

      <section className={styles.area} aria-label="New area">
        <h2 className={styles.h2}>New area</h2>
        <form
          className={styles.inline}
          onSubmit={(e) => {
            e.preventDefault();
            void createArea();
          }}
        >
          <input
            className={styles.input}
            value={newArea.area}
            onChange={(e) => setNewArea((n) => ({ ...n, area: e.target.value }))}
            placeholder="Area name"
            aria-label="New area name"
          />
          <input
            className={styles.input}
            value={newArea.tag}
            onChange={(e) => setNewArea((n) => ({ ...n, tag: e.target.value }))}
            placeholder="its first tag"
            aria-label="First tag for the new area"
          />
          <button type="submit" className={styles.primary}>
            Create area
          </button>
        </form>
      </section>
    </div>
  );
}
