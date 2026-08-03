# Image guidelines — where images render and what they require

Every image surface, the box it renders in, and how it gets a sharp source on
any screen. The mechanism is `srcset`/`sizes`: each surface declares its
layout width (`sizes`), the browser multiplies by the device pixel ratio and
picks the smallest sufficient variant from the ladder. No image CDN — the
site is a static export, so every variant is a real file, generated at upload
time or committed.

## Display surfaces

| Surface                    | Component                   | `sizes`                         | Ladder source             |
| -------------------------- | --------------------------- | ------------------------------- | ------------------------- |
| Member card (grid)         | `MembersIndex`              | `(max-width:640px) 94vw, 330px` | avatar ladder             |
| Research card (grid)       | `ResearchIndex`             | `(max-width:640px) 94vw, 330px` | avatar or research ladder |
| Member profile avatar      | `PersonView`                | `108px`                         | avatar ladder             |
| Research roster avatar     | `ResearchEntryView` (`pav`) | `120px`                         | avatar ladder             |
| Legacy files-section image | `ResearchEntryView`         | `(max-width:640px) 94vw, 330px` | research ladder           |
| Dashboard avatar preview   | `member/Dashboard`          | `84px`                          | avatar ladder             |
| Homepage pixel-wall tile   | `PixelMark`                 | — (plain 128px twin)            | avatar-128                |
| Research page figure       | `MarkdownPage`              | per placement, computed         | research ladder           |
| Research editor file thumb | `ResearchEditor`            | — (plain `-w800` variant)       | research ladder           |
| About page figures         | `AboutPage`                 | per figure                      | committed `-w` variants   |

## The ladders (all variants are real files — no CDN, no upscaling)

- **Avatars** (`lib/data/storage.ts`): every upload writes
  `avatar-128/256/512/1024.jpg`, square-cropped. The DB stores the 1024 URL.
  Legacy accounts have only `avatar-512` + `avatar-128`; `avatarSrcSet()`
  detects the era from the filename and emits only files that exist.
- **Research images**: every image upload writes `…-w800/-w1600/-w2400.jpg`;
  the DB row and markdown references point at `-w2400`. Pre-ladder uploads
  (no `-w2400` suffix) get plain `src` — `researchImgSrcSet()` returns
  undefined for them. Deleting a file removes all its variants.
- **Static assets**: `npm run images` (`scripts/image-ladder.mjs`) writes
  committed `-w<w>` siblings next to originals in `public/about`. Run it when
  adding static images; components reference the variants explicitly.
- External avatars (GitHub, pravatar) resize server-side via size params.

## Upload requirements (shown in the upload UIs)

- **Avatar**: JPEG/PNG/WebP ≤10 MB, square, **source at least 512×512,
  ideally ≥1024×1024** (`UPLOAD_SPECS.avatar`).
- **Research image**: ≤15 MB, **source at least 2000 px on the long edge**
  (`UPLOAD_SPECS.researchImage`). Phone photos are ideal input; screenshots
  and exported diagrams are the usual offenders below the minimum.

## Rules when adding a new image surface

1. Write the `sizes` attribute first — how wide is this image at each
   breakpoint? That is the surface's dimension requirement, in code.
2. Attach `srcSet` via the helpers in `lib/util/media.ts`
   (`avatarSrcSet` / `researchImgSrcSet`), keeping a plain `src` fallback via
   `thumbUrl(url, px)` or the file URL. Never hand-build an srcset whose
   candidates aren't guaranteed to exist — a 404 candidate renders broken.
3. New static assets: run `npm run images` and reference the variants.
4. Add the surface to the table above.

## Known source-limited images

- `public/about/stat.jpg` (1226 px wide) — slightly soft at full column width
  on retina; the original site has no larger version.
- `public/research/thumb/*.jpg` (640 px) — adequate at card size, no larger
  sources committed; regenerate from the curated pages' embedded images if
  they ever need to render bigger.
