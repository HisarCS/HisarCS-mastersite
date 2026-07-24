/**
 * Small-avatar URL for grids & cards. Uploaded avatars have a 128px twin next
 * to the 512px original; external providers take a size hint. Unknown URLs pass
 * through untouched.
 */
export function thumbUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.includes('/avatars/') && url.includes('avatar-512'))
    return url.replace('avatar-512', 'avatar-128');
  if (/avatars\.githubusercontent\.com/.test(url))
    return url + (url.includes('?') ? '&' : '?') + 's=128';
  if (/github\.com\/[^/]+\.png/.test(url)) return url.split('?')[0] + '?size=128';
  if (/i\.pravatar\.cc\/\d+/.test(url)) return url.replace(/pravatar\.cc\/\d+/, 'pravatar.cc/128');
  return url;
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
    maxDim: 512,
    label: 'JPEG, PNG or WebP up to 10 MB',
  },
  projectImage: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxMB: 15,
    maxDim: 1600,
    label: 'images: JPEG/PNG/WebP up to 15 MB',
  },
  resume: { accept: ['application/pdf'], maxMB: 5, label: 'PDF up to 5 MB' },
  projectPdf: { accept: ['application/pdf'], maxMB: 10, label: 'PDFs up to 10 MB' },
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
