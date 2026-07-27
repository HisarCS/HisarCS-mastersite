'use client';

import type { FC } from 'react';
import type {
  GalleryBlock,
  LinksBlock,
  ListBlock,
  MediaBlock,
  NumbersBlock,
  PageBlock,
  TableBlock,
} from '@/lib/domain/blocks';
import type { ResearchFile } from '@/lib/domain/types';
import styles from './Builder.module.css';

/**
 * Block registry — the single place a block type is defined for the editor:
 * label, one-line hint, default data, and its edit form. Adding a block type =
 * one entry here (+ a case in BlockRenderer). Nothing else enumerates types.
 */

export interface BlockFormProps<B extends PageBlock = PageBlock> {
  block: B;
  onChange: (b: PageBlock) => void;
  /** uploaded files of this entry — image sources for media/gallery */
  files: ResearchFile[];
}

/* ---------- shared small controls ---------- */

function VariantPicker({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: string[];
  onChange: (v: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div className={styles.variants}>
      {options.map((v) => (
        <button
          key={v}
          type="button"
          className={`${styles.variantBtn} ${(value ?? options[0]) === v ? styles.on : ''}`}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/** src = uploaded image (storage path) or an external https URL. */
function SrcPicker({
  value,
  files,
  onChange,
}: {
  value: string;
  files: ResearchFile[];
  onChange: (v: string) => void;
}) {
  const images = files.filter((f) => f.kind === 'image');
  const isUpload = images.some((f) => f.storagePath === value);
  return (
    <div className={styles.srcRow}>
      <select
        value={isUpload ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={styles.srcSelect}
      >
        <option value="">{images.length ? 'Pick an uploaded image…' : 'No uploads yet'}</option>
        {images.map((f) => (
          <option key={f.id} value={f.storagePath}>
            {f.caption || f.storagePath.split('/').pop()}
          </option>
        ))}
      </select>
      <input
        placeholder="…or an external image URL (https://)"
        value={isUpload ? '' : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ---------- per-type forms ---------- */

const TextForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as import('@/lib/domain/blocks').TextBlock;
  return (
    <>
      <input
        placeholder="Heading (optional)"
        value={b.data.heading ?? ''}
        onChange={(e) =>
          onChange({ ...b, data: { ...b.data, heading: e.target.value || undefined } })
        }
      />
      <textarea
        placeholder="Text. Blank line = new paragraph. **bold**, *italic*, `code`, [link](https://…)"
        value={b.data.md}
        rows={5}
        onChange={(e) => onChange({ ...b, data: { ...b.data, md: e.target.value } })}
      />
      <VariantPicker
        value={b.variant ?? 'normal'}
        options={['normal', 'lede']}
        onChange={(v) => onChange({ ...b, variant: v === 'lede' ? 'lede' : undefined })}
      />
    </>
  );
};

const MediaForm: FC<BlockFormProps> = ({ block, onChange, files }) => {
  const b = block as MediaBlock;
  return (
    <>
      <SrcPicker
        value={b.data.src}
        files={files}
        onChange={(src) => onChange({ ...b, data: { ...b.data, src } })}
      />
      <input
        placeholder="Caption (required — what does this show?)"
        value={b.data.caption}
        onChange={(e) => onChange({ ...b, data: { ...b.data, caption: e.target.value } })}
      />
      <VariantPicker
        value={b.variant}
        options={['full', 'inset']}
        onChange={(v) => onChange({ ...b, variant: v as MediaBlock['variant'] })}
      />
    </>
  );
};

const GalleryForm: FC<BlockFormProps> = ({ block, onChange, files }) => {
  const b = block as GalleryBlock;
  const set = (items: GalleryBlock['data']['items']) => onChange({ ...b, data: { items } });
  return (
    <>
      {b.data.items.map((it, i) => (
        <div key={i} className={styles.subRow}>
          <SrcPicker
            value={it.src}
            files={files}
            onChange={(src) => set(b.data.items.map((x, j) => (j === i ? { ...x, src } : x)))}
          />
          <div className={styles.subRowLine}>
            <input
              placeholder="Caption (required)"
              value={it.caption}
              onChange={(e) =>
                set(b.data.items.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))
              }
            />
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() => set(b.data.items.filter((_, j) => j !== i))}
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={styles.miniBtn}
        onClick={() => set([...b.data.items, { src: '', caption: '' }])}
      >
        + image
      </button>
      <VariantPicker
        value={b.variant}
        options={['grid', 'pair', 'sequence']}
        onChange={(v) => onChange({ ...b, variant: v as GalleryBlock['variant'] })}
      />
    </>
  );
};

const NumbersForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as NumbersBlock;
  const set = (items: NumbersBlock['data']['items']) => onChange({ ...b, data: { items } });
  return (
    <>
      {b.data.items.map((it, i) => (
        <div key={i} className={styles.subRowLine}>
          <input
            placeholder="Value (e.g. €4.10)"
            value={it.value}
            onChange={(e) =>
              set(b.data.items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
            }
          />
          <input
            placeholder="Label (e.g. per panel)"
            value={it.label}
            onChange={(e) =>
              set(b.data.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
          />
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => set(b.data.items.filter((_, j) => j !== i))}
            aria-label="Remove number"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.miniBtn}
        onClick={() => set([...b.data.items, { value: '', label: '' }])}
      >
        + number
      </button>
      <VariantPicker
        value={b.variant}
        options={['chips', 'tiles']}
        onChange={(v) => onChange({ ...b, variant: v as NumbersBlock['variant'] })}
      />
    </>
  );
};

const TableForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as TableBlock;
  return (
    <>
      <input
        placeholder="Heading (optional)"
        value={b.data.heading ?? ''}
        onChange={(e) =>
          onChange({ ...b, data: { ...b.data, heading: e.target.value || undefined } })
        }
      />
      <input
        placeholder="Header cells, separated by | (leave empty for no header)"
        value={b.data.header.join(' | ')}
        onChange={(e) =>
          onChange({
            ...b,
            data: {
              ...b.data,
              header: e.target.value ? e.target.value.split('|').map((s) => s.trim()) : [],
            },
          })
        }
      />
      <textarea
        placeholder={
          'One row per line, cells separated by |\nSpent coffee grounds | 60% | cafeteria'
        }
        rows={4}
        value={b.data.rows.map((r) => r.join(' | ')).join('\n')}
        onChange={(e) =>
          onChange({
            ...b,
            data: {
              ...b.data,
              rows: e.target.value
                .split('\n')
                .filter((l) => l.trim())
                .map((l) => l.split('|').map((s) => s.trim())),
            },
          })
        }
      />
      <input
        placeholder="Note under the table (optional)"
        value={b.data.note ?? ''}
        onChange={(e) => onChange({ ...b, data: { ...b.data, note: e.target.value || undefined } })}
      />
      <VariantPicker
        value={b.variant}
        options={['plain', 'kv']}
        onChange={(v) => onChange({ ...b, variant: v as TableBlock['variant'] })}
      />
    </>
  );
};

const ListForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as ListBlock;
  return (
    <>
      <input
        placeholder="Heading (optional)"
        value={b.data.heading ?? ''}
        onChange={(e) =>
          onChange({ ...b, data: { ...b.data, heading: e.target.value || undefined } })
        }
      />
      <textarea
        placeholder="One item per line"
        rows={4}
        value={b.data.items.join('\n')}
        onChange={(e) => onChange({ ...b, data: { ...b.data, items: e.target.value.split('\n') } })}
      />
      <VariantPicker
        value={b.variant}
        options={['bulleted', 'numbered', 'steps']}
        onChange={(v) => onChange({ ...b, variant: v as ListBlock['variant'] })}
      />
    </>
  );
};

const QuoteForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as import('@/lib/domain/blocks').QuoteBlock;
  return (
    <>
      <textarea
        placeholder="The quote"
        rows={2}
        value={b.data.text}
        onChange={(e) => onChange({ ...b, data: { ...b.data, text: e.target.value } })}
      />
      <input
        placeholder="Who said it (optional)"
        value={b.data.attribution ?? ''}
        onChange={(e) =>
          onChange({ ...b, data: { ...b.data, attribution: e.target.value || undefined } })
        }
      />
    </>
  );
};

const CodeForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as import('@/lib/domain/blocks').CodeBlock;
  return (
    <>
      <input
        placeholder="Language (optional, e.g. python)"
        value={b.data.language ?? ''}
        onChange={(e) =>
          onChange({ ...b, data: { ...b.data, language: e.target.value || undefined } })
        }
      />
      <textarea
        placeholder="Code"
        rows={6}
        className={styles.mono}
        value={b.data.body}
        onChange={(e) => onChange({ ...b, data: { ...b.data, body: e.target.value } })}
      />
    </>
  );
};

const LinksForm: FC<BlockFormProps> = ({ block, onChange }) => {
  const b = block as LinksBlock;
  const set = (items: LinksBlock['data']['items']) => onChange({ ...b, data: { items } });
  return (
    <>
      {b.data.items.map((it, i) => (
        <div key={i} className={styles.subRowLine}>
          <input
            placeholder="Kind (pdf/csv/video…)"
            className={styles.narrow}
            value={it.kind ?? ''}
            onChange={(e) =>
              set(
                b.data.items.map((x, j) =>
                  j === i ? { ...x, kind: e.target.value || undefined } : x,
                ),
              )
            }
          />
          <input
            placeholder="Label"
            value={it.label}
            onChange={(e) =>
              set(b.data.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
          />
          <input
            placeholder="https://…"
            value={it.url}
            onChange={(e) =>
              set(b.data.items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
            }
          />
          <button
            type="button"
            className={styles.miniBtn}
            onClick={() => set(b.data.items.filter((_, j) => j !== i))}
            aria-label="Remove link"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.miniBtn}
        onClick={() => set([...b.data.items, { label: '', url: '' }])}
      >
        + link
      </button>
      <VariantPicker
        value={b.variant}
        options={['row', 'list']}
        onChange={(v) => onChange({ ...b, variant: v as LinksBlock['variant'] })}
      />
    </>
  );
};

/* ---------- the registry ---------- */

export interface BlockDef {
  label: string;
  hint: string;
  defaults: () => PageBlock;
  Form: FC<BlockFormProps>;
  /** blocking problems (missing captions etc.) — shown, and gate saving */
  problems: (b: PageBlock) => string[];
}

export const BLOCK_DEFS: Record<PageBlock['type'], BlockDef> = {
  text: {
    label: 'Text',
    hint: 'Paragraphs, with an optional small heading.',
    defaults: () => ({ type: 'text', data: { md: '' } }),
    Form: TextForm,
    problems: (b) => (b.type === 'text' && !b.data.md.trim() ? ['text is empty'] : []),
  },
  media: {
    label: 'Image',
    hint: 'One image with a caption. Upload it under Files first, or use an external URL.',
    defaults: () => ({ type: 'media', variant: 'full', data: { src: '', caption: '' } }),
    Form: MediaForm,
    problems: (b) =>
      b.type === 'media'
        ? [
            ...(!b.data.src ? ['no image chosen'] : []),
            ...(!b.data.caption.trim() ? ['caption required'] : []),
          ]
        : [],
  },
  gallery: {
    label: 'Gallery',
    hint: 'Several images side by side — a grid, a before/after pair, or a sequence.',
    defaults: () => ({
      type: 'gallery',
      variant: 'grid',
      data: {
        items: [
          { src: '', caption: '' },
          { src: '', caption: '' },
        ],
      },
    }),
    Form: GalleryForm,
    problems: (b) =>
      b.type === 'gallery'
        ? b.data.items.flatMap((it, i) => [
            ...(!it.src ? [`image ${i + 1}: no image chosen`] : []),
            ...(!it.caption.trim() ? [`image ${i + 1}: caption required`] : []),
          ])
        : [],
  },
  numbers: {
    label: 'Numbers',
    hint: 'Headline figures — cost, time, accuracy. Chips (small) or tiles (big).',
    defaults: () => ({
      type: 'numbers',
      variant: 'chips',
      data: { items: [{ value: '', label: '' }] },
    }),
    Form: NumbersForm,
    problems: (b) =>
      b.type === 'numbers' && b.data.items.some((it) => !it.value.trim() || !it.label.trim())
        ? ['every number needs a value and a label']
        : [],
  },
  table: {
    label: 'Table',
    hint: 'Rows and columns — a parts list, a recipe, a spec sheet.',
    defaults: () => ({ type: 'table', variant: 'plain', data: { header: [], rows: [] } }),
    Form: TableForm,
    problems: (b) => (b.type === 'table' && b.data.rows.length === 0 ? ['table has no rows'] : []),
  },
  list: {
    label: 'List',
    hint: 'Bulleted, numbered, or step-by-step with big step markers.',
    defaults: () => ({ type: 'list', variant: 'steps', data: { items: [''] } }),
    Form: ListForm,
    problems: (b) =>
      b.type === 'list' && !b.data.items.some((it) => it.trim()) ? ['list has no items'] : [],
  },
  quote: {
    label: 'Quote',
    hint: 'Something someone said, with attribution.',
    defaults: () => ({ type: 'quote', data: { text: '' } }),
    Form: QuoteForm,
    problems: (b) => (b.type === 'quote' && !b.data.text.trim() ? ['quote is empty'] : []),
  },
  code: {
    label: 'Code',
    hint: 'A code snippet.',
    defaults: () => ({ type: 'code', data: { body: '' } }),
    Form: CodeForm,
    problems: (b) => (b.type === 'code' && !b.data.body.trim() ? ['code is empty'] : []),
  },
  links: {
    label: 'Links',
    hint: 'Buttons to a PDF, data, code, or a hosted video (YouTube/Drive).',
    defaults: () => ({ type: 'links', variant: 'row', data: { items: [{ label: '', url: '' }] } }),
    Form: LinksForm,
    problems: (b) =>
      b.type === 'links' &&
      b.data.items.some((it) => !it.label.trim() || !/^https?:\/\//.test(it.url))
        ? ['every link needs a label and an http(s) URL']
        : [],
  },
};
