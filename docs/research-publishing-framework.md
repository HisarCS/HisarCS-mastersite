# Documenting and publishing research — draft 2

What a research project on this site must have, and advice that makes it
cheaper to produce. Requirements are the minimum; everything else is your call.

Worked example: [`docs/examples/mycelium-acoustic-panels.md`](examples/mycelium-acoustic-panels.md)
— the full source of a page in this dialect; paste it into the editor's Write
tab to see it rendered.

## Requirements

While you work:

1. One folder per project for photos, video, and data. One sheet for numbers,
   units in the headers.
2. Photograph anything you cannot re-create later — first prototype, failed
   attempts, intermediate states, test setups. Take the photo when it happens.
3. If you will claim a number (cost, time, accuracy, ...), record it when it
   happens. If you compare against something, measure that thing too, the same
   way.
4. When something fails or you change direction, write down why. One line is
   enough.

When you publish:

5. The page has: title, authors, a 1–2 sentence summary of what it is and why
   it matters, at least one captioned image, and the numbers behind every claim.
6. Every image and chart has a caption. A chart answers one question; say the
   question in the caption.
7. Formats: photos JPEG/PNG ≥1600 px · diagrams SVG or PNG · video hosted
   externally (unlisted YouTube/Drive) and linked · data as CSV/sheet · papers
   as PDF ≤10 MB.
8. Paper: the venue's format decides, not us. Put the PDF on the page with a
   short plain-language summary.
9. Tutorial: complete parts list with sources, steps someone else can follow,
   and the known ways it goes wrong.

## Advice

- Five minutes of photos and notes at the end of a session is cheaper than a
  day of reconstruction at the end of the project.
- Decide early which numbers you will need. You cannot measure the past.
- Few photos, chosen. Eight good ones beat forty.
- Publish the failures. That is the part your peers actually need.
- Put the point and the strongest evidence at the top. Readers decide in
  seconds whether to keep reading.
- The existing pages under `public/research/` are good structural examples —
  borrow their structure, not their content.

## The page

Layout: **title → authors → body → date**. Authors come from the research
entry's member list (site members link to their member page; outside
collaborators are plain text). The body is one Markdown document, written in
the editor at `/research/edit`. Styling comes from the site; you write content,
not fonts and colors.

The dialect (full reference inside the editor):

| Feature    | Syntax                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure  | GitHub-flavored Markdown: `##` headings, tables, lists, quotes, code                                                                              |
| Equations  | `$inline$` · `$$display$$` on their own lines (KaTeX)                                                                                             |
| Chart      | ` ```chart ` fence: `type: bar\|line` · `question:` (required — becomes the caption) · `x:` categories · `Name: v1, v2, …` per series             |
| Stat chips | ` ```stats ` fence: one `value \| label` per line                                                                                                 |
| Image      | `![Caption](src "placement")` — placement `full · wide · inset · left 40 · right 40`; own line = captioned figure, two on one line = side by side |
| Video      | host externally (unlisted YouTube/Drive), add as a normal link                                                                                    |

`src` is an uploaded file's storage path (use the editor's Image button) or an
https URL. Raw HTML is never rendered; every URL is sanitized.

Stored on the research row:

```
research.page jsonb: { "version": 2, "markdown": "…" }
```

Null (or an empty document) means no composed page — readers see the
Description instead, so old entries keep working.

## Editor notes (maintainers)

- One renderer (`components/markdown/MarkdownPage`) serves the public page and
  the editor preview — they cannot drift.
- The custom fences are parsed by pure, unit-tested functions in
  `lib/util/chartSpec.ts`; the renderer only draws parse results. A malformed
  fence renders an inline error, never silence.
- Adding a fence = one parser + one branch in the renderer's `pre` handler.
  Prefer extending a parser over inventing new syntax.
- `page.version` changes only if the stored shape breaks, with a read-time
  migration in `lib/domain/page.ts`. v1 (a briefly-shipped block format) is
  read as null — see ADR-0019.
- Security: no `dangerouslySetInnerHTML`; react-markdown emits React elements,
  raw HTML in documents is ignored, URLs pass `safeUrl`.
