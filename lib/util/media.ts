/**
 * Sized avatar URL for a given display need. `px` is the largest physical size
 * the image renders at: CSS size × device pixel ratio (assume 2× retina), so a
 * 300px-wide card wants px=512+, a 40px chip is fine at the default 128.
 *
 * Uploaded avatars keep a 128px twin next to the full-size original
 * (avatar-512 or avatar-1024 depending on upload era); external providers take
 * a size hint. Unknown URLs pass through untouched.
 */
export function thumbUrl(url: string | null | undefined, px = 128): string | null | undefined {
  if (!url) return url;
  if (url.includes('/avatars/')) {
    // ≤128 → the small twin; anything larger → the stored original.
    return px <= 128 ? url.replace(/avatar-\d+/, 'avatar-128') : url;
  }
  if (/avatars\.githubusercontent\.com/.test(url)) return withParam(url, 's', px);
  if (/github\.com\/[^/]+\.png/.test(url)) return withParam(url, 'size', px);
  if (/i\.pravatar\.cc\/\d+/.test(url))
    return url.replace(/pravatar\.cc\/\d+/, `pravatar.cc/${px}`);
  return url;
}

/* ----------------------------------------------------------------------------
 * Responsive images (srcset). The site is a static export with no image CDN,
 * so every srcset candidate must be a file that actually exists — a candidate
 * that 404s renders broken, it does NOT fall back to `src`. The helpers below
 * therefore only emit ladders they can prove exist from the URL shape, and
 * return undefined otherwise (callers then rely on plain `src`).
 * ------------------------------------------------------------------------- */

/** Widths uploaded for every avatar (each stored as `avatar-<w>.jpg`). */
export const AVATAR_LADDER = [128, 256, 512, 1024] as const;
/** Widths uploaded for every research image (stored as `…-w<w>.jpg`). */
export const RESEARCH_IMG_LADDER = [800, 1600, 2400] as const;

const withParam = (u: string, key: string, val: number) => {
  const [base, q] = u.split('?');
  const params = new URLSearchParams(q ?? '');
  params.set(key, String(val));
  return `${base}?${params}`;
};

/**
 * srcset for an avatar URL, or undefined when only one size is known to exist.
 * Uploaded avatars encode their ladder in the filename: `avatar-1024` uploads
 * come with 128/256/512 twins; legacy `avatar-512` uploads only have a 128
 * twin. External providers (GitHub, pravatar) resize on demand.
 */
export function avatarSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('/avatars/')) {
    const widths = url.includes('avatar-1024')
      ? AVATAR_LADDER
      : url.includes('avatar-512')
        ? [128, 512]
        : null;
    if (!widths) return undefined;
    return widths.map((w) => `${url.replace(/avatar-\d+/, `avatar-${w}`)} ${w}w`).join(', ');
  }
  if (/avatars\.githubusercontent\.com/.test(url))
    return AVATAR_LADDER.map((w) => `${withParam(url, 's', w)} ${w}w`).join(', ');
  if (/github\.com\/[^/]+\.png/.test(url))
    return AVATAR_LADDER.map((w) => `${withParam(url, 'size', w)} ${w}w`).join(', ');
  if (/i\.pravatar\.cc\/\d+/.test(url))
    return AVATAR_LADDER.map(
      (w) => `${url.replace(/pravatar\.cc\/\d+/, `pravatar.cc/${w}`)} ${w}w`,
    ).join(', ');
  return undefined;
}

/**
 * srcset for a research image URL or storage path. Only images uploaded with
 * the ladder convention (name ending `-w2400.jpg`) qualify; older single-file
 * uploads and external URLs return undefined.
 */
export function researchImgSrcSet(url: string | null | undefined): string | undefined {
  if (!url || !/-w2400\.jpg$/i.test(url)) return undefined;
  return RESEARCH_IMG_LADDER.map((w) => `${url.replace(/-w2400\.jpg$/i, `-w${w}.jpg`)} ${w}w`).join(
    ', ',
  );
}

/** Smallest ladder variant of a research image — for editor thumbnails. */
export function researchImgSmall(url: string): string {
  return url.replace(/-w2400\.jpg$/i, '-w800.jpg');
}

export interface UploadSpec {
  accept: string[];
  maxMB: number;
  maxDim?: number;
  label: string;
}

/** File-upload requirements — one source of truth (was config.js IDEALAB_UPLOADS). */
export const UPLOAD_SPECS = {
  avatar: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxMB: 10,
    maxDim: 1024,
    label: 'JPEG, PNG or WebP up to 10 MB, at least 512×512 px',
  },
  researchImage: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxMB: 15,
    maxDim: 2400,
    label: 'images: JPEG/PNG/WebP up to 15 MB, at least 2000 px on the long edge',
  },
  resume: { accept: ['application/pdf'], maxMB: 5, label: 'PDF up to 5 MB' },
  researchPdf: { accept: ['application/pdf'], maxMB: 10, label: 'PDFs up to 10 MB' },
} satisfies Record<string, UploadSpec>;

/** Validate a picked file against a spec. Returns an error string, or null. */
export function checkFile(file: File | null | undefined, spec: UploadSpec): string | null {
  if (!file) return 'no file selected';
  if (!spec.accept.includes(file.type)) return `wrong file type — ${spec.label}`;
  if (file.size > spec.maxMB * 1024 * 1024) {
    return `file is ${(file.size / 1048576).toFixed(1)} MB — ${spec.label}`;
  }
  return null;
}

/**
 * High-quality client-side image optimization (browser only). Iteratively halves
 * large images before the final draw (one-step scaling aliases badly), then
 * exports JPEG. `square` center-crops first (avatars). Returns a JPEG Blob.
 */
export async function optimizeImage(
  file: File,
  maxDim: number,
  opts: { square?: boolean; quality?: number } = {},
): Promise<Blob> {
  const quality = opts.quality ?? 0.85;
  let src: CanvasImageSource & { width: number; height: number } = (await createImageBitmap(
    file,
  )) as CanvasImageSource & { width: number; height: number };
  let w = src.width;
  let h = src.height;

  if (opts.square) {
    const side = Math.min(w, h);
    const c = document.createElement('canvas');
    c.width = c.height = side;
    c.getContext('2d')!.drawImage(
      src,
      (w - side) / 2,
      (h - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    src = c as unknown as CanvasImageSource & { width: number; height: number };
    w = h = side;
  }

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  while (w / 2 >= tw && w > 2) {
    const c = document.createElement('canvas');
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    src = c as unknown as CanvasImageSource & { width: number; height: number };
  }

  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff'; // flatten PNG alpha for JPEG
  ctx.fillRect(0, 0, tw, th);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, tw, th);
  return new Promise<Blob>((res, rej) =>
    out.toBlob((b) => (b ? res(b) : rej(new Error('image encode failed'))), 'image/jpeg', quality),
  );
}
