'use client';

import { useMemo, useRef, useState } from 'react';
import type { MemberCard } from '@/lib/domain/types';
import styles from './MemberPicker.module.css';

/**
 * Type-to-search collaborator picker. Filters site members as you type and
 * offers them as suggestions; if nothing matches, Enter adds the typed text as
 * an *external* collaborator (someone with no account here — a display-only
 * credit, see `research.external_authors`).
 */
export function MemberPicker({
  people,
  onPickMember,
  onAddExternal,
  disabled = false,
}: {
  /** candidates — callers should exclude anyone already on the entry */
  people: MemberCard[];
  onPickMember: (personId: string, role: string) => void;
  onAddExternal: (name: string, role: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people.slice(0, 8);
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [people, query]);

  const exact = useMemo(
    () => people.find((p) => p.name.toLowerCase() === query.trim().toLowerCase()),
    [people, query],
  );

  const reset = () => {
    setQuery('');
    setRole('');
    setOpen(false);
    setActive(0);
  };

  const pick = (p: MemberCard) => {
    onPickMember(p.id, role.trim());
    reset();
  };

  const commit = () => {
    const name = query.trim();
    if (!name) return;
    if (exact) {
      pick(exact);
      return;
    }
    if (matches.length === 1) {
      pick(matches[0]!);
      return;
    }
    onAddExternal(name, role.trim()); // no match → an outside collaborator
    reset();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[active]) pick(matches[active]!);
      else commit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <input
          value={query}
          disabled={disabled}
          placeholder="Search a member, or type a name"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          // let a click on a suggestion land before the list closes
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul className={styles.list}>
            {matches.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`${styles.option} ${i === active ? styles.active : ''}`}
                  onMouseDown={() => window.clearTimeout(blurTimer.current)}
                  onClick={() => pick(p)}
                >
                  {p.name}
                </button>
              </li>
            ))}
            {query.trim() && !exact && (
              <li>
                <button
                  type="button"
                  className={styles.option}
                  onMouseDown={() => window.clearTimeout(blurTimer.current)}
                  onClick={() => {
                    onAddExternal(query.trim(), role.trim());
                    reset();
                  }}
                >
                  Add “<strong>{query.trim()}</strong>” as an outside collaborator
                </button>
              </li>
            )}
            {!query.trim() && matches.length === 0 && (
              <li className={styles.empty}>No members to add.</li>
            )}
          </ul>
        )}
      </div>
      <input
        className={styles.role}
        value={role}
        disabled={disabled}
        placeholder="Role (optional)"
        onChange={(e) => setRole(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <button className={styles.add} onClick={commit} disabled={disabled || !query.trim()}>
        Add
      </button>
    </div>
  );
}
