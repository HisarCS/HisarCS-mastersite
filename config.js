/* ============================================================================
   ideaLab — environment config
   ----------------------------------------------------------------------------
   ONE codebase, TWO backends. Every page picks its Supabase automatically:

     • any LOCAL / private address → the LOCAL Supabase CLI stack
         (localhost, 127.0.0.1, ::1, a bare machine name, *.local, a private-LAN
          IP like 192.168.x/10.x/172.16-31.x, or a file:// open)
     • a real PUBLIC host (GitHub Pages, a custom domain) → PRODUCTION

   Rationale: local development is ALWAYS local, however you reach the dev
   server — by name or by LAN IP — so it can never silently hit the production
   database. Production is only ever the deployed public site. This is pure
   hostname logic: no IPs are hard-coded, and it reproduces identically on any
   machine (Linux/Windows/Mac) that clones this repo. To preview production
   behaviour, open the deployed URL — not the local server.

   So the exact files you validate locally are the files you deploy — no
   build step, no branch juggling, no "did I swap the key?" mistakes.

   LOCAL: the anon key below is the CLI's standard demo key. If
   `npx supabase status` prints a different one, paste it here.

   PRODUCTION: fill in after creating the cloud project (README §7) —
   Dashboard → Settings → API. The anon key is designed to be public;
   Row Level Security is the actual boundary. Until these are filled, the
   deployed site runs on built-in mock data (and warns in the console).
   ============================================================================ */
const IDEALAB_ENVIRONMENTS = {
  local: {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  },
  production: {
    SUPABASE_URL: 'https://orxqdmhanoqcwqsxxjbg.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_yTI2NY-P1kWNIMN7jIL8Qw_UGAmz_6f',
  },
};

function idealabIsLocalHost(h) {
  return (
    h === '' ||
    h === 'localhost' ||
    h === '127.0.0.1' || // '' = file:// open
    h === '::1' ||
    h === '[::1]' ||
    h === '0.0.0.0' ||
    !h.includes('.') || // bare machine name
    h.endsWith('.local') || // mDNS / Bonjour
    /^10\./.test(h) || // private LAN ranges
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)
  );
}
window.IDEALAB_ENV = idealabIsLocalHost(location.hostname) ? 'local' : 'production';
window.IDEALAB_CONFIG = IDEALAB_ENVIRONMENTS[window.IDEALAB_ENV];
window.IDEALAB_BUILD = '20260719-2'; // bump on deploys — proves which build a device is seeing
console.log(`ideaLab: ${window.IDEALAB_ENV} environment · build ${window.IDEALAB_BUILD}`);

/* Shared helper: returns a Supabase client, or null → pages use mock data. */
window.idealabClient = function () {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.IDEALAB_CONFIG || {};
    if (!window.supabase) {
      console.warn('ideaLab: vendor/supabase.js did not load — using mock data');
      return null;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn(
        `ideaLab: no ${window.IDEALAB_ENV} Supabase configured — using mock data (config.js)`,
      );
      return null;
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('ideaLab: Supabase client init failed', e);
  }
  return null;
};

/* Academic year (flips July 1, matching current_academic_year() in the DB) */
window.idealabAcademicYear = function () {
  const now = new Date();
  return now.getFullYear() + (now.getMonth() >= 6 ? 1 : 0);
};

/* ============================================================================
   File-upload requirements — ONE source of truth, shared by every page.
   Images are auto-optimized client-side before upload (see below), so the
   "maxMB" caps are on the SOURCE file the member picks; what actually lands
   in storage is far smaller. PDFs upload as-is (recompressing would cost
   fidelity), so their caps are hard limits.
   ============================================================================ */
window.IDEALAB_UPLOADS = {
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
};

/* Validate a picked file against a spec above. Returns an error string, or
   null if the file is acceptable. */
window.idealabCheckFile = function (file, spec) {
  if (!file) return 'no file selected';
  if (!spec.accept.includes(file.type)) return `wrong file type — ${spec.label}`;
  if (file.size > spec.maxMB * 1024 * 1024) {
    return `file is ${(file.size / 1048576).toFixed(1)} MB — ${spec.label}`;
  }
  return null;
};

/* High-quality client-side image optimization.
   Iteratively halves large images before the final draw (plain one-step canvas
   scaling aliases badly on big photos), then exports JPEG at q0.85 — visually
   lossless at the sizes this site displays, ~10-20× smaller than a phone
   photo. `square: true` center-crops first (avatars). Returns a JPEG Blob. */
window.idealabOptimizeImage = async function (file, maxDim, opts = {}) {
  const quality = opts.quality ?? 0.85;
  /** @type {CanvasImageSource & { width: number, height: number }} */
  let src = await createImageBitmap(file);
  let w = src.width,
    h = src.height;

  if (opts.square) {
    const side = Math.min(w, h);
    const c = document.createElement('canvas');
    c.width = c.height = side;
    c.getContext('2d').drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, side, side);
    src = c;
    w = h = side;
  }

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale)),
    th = Math.max(1, Math.round(h * scale));

  while (w / 2 >= tw && w > 2) {
    // stepped downscale keeps detail crisp
    const c = document.createElement('canvas');
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    src = c;
  }

  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, tw, th); // flatten PNG alpha for JPEG
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, tw, th);
  return new Promise((res, rej) =>
    out.toBlob((b) => (b ? res(b) : rej(new Error('image encode failed'))), 'image/jpeg', quality),
  );
};

/* Small-avatar URL for the homepage grid & hover cards. Uploaded avatars have
   a 128px twin next to the 512px original; external providers all take a size
   hint. Falls back to the original URL untouched. */
window.idealabThumbUrl = function (url) {
  if (!url) return url;
  if (url.includes('/avatars/') && url.includes('avatar-512'))
    return url.replace('avatar-512', 'avatar-128');
  if (/avatars\.githubusercontent\.com/.test(url))
    return url + (url.includes('?') ? '&' : '?') + 's=128';
  if (/github\.com\/[^/]+\.png/.test(url)) return url.split('?')[0] + '?size=128';
  if (/i\.pravatar\.cc\/\d+/.test(url)) return url.replace(/pravatar\.cc\/\d+/, 'pravatar.cc/128');
  return url;
};

/* Escape a value for safe interpolation into HTML text or a double-quoted
   attribute. Use for EVERY piece of user/DB data placed into innerHTML. */
window.idealabEsc = function (s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
};

/* Sanitize a URL for an href/src: allow relative paths and http/https/mailto;
   reject javascript:, data:, and any other scheme. Still esc() the result for
   attribute context. */
window.idealabSafeUrl = function (u) {
  const s = String(u ?? '').trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^(?:https?|mailto):/i.test(s)) return '#';
  return s;
};

/* Minimal full-page state for "nothing to show / can't start" — matches the
   homepage: cream canvas, the brand mark drawn as a downturned ".(" . Shared by
   person/project/member so every honest state looks identical. */
window.idealabErrorPage = function (heading, detail) {
  document.title = `${heading} — ideaLab`;
  document.documentElement.style.background = '#f6f4ef';
  document.body.style.cssText = 'margin:0;background:#f6f4ef';
  document.body.innerHTML = `<main style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                  gap:15px;padding:28px;text-align:center;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#141414">
       <div aria-hidden="true" style="font-size:58px;font-weight:700;letter-spacing:-.05em;line-height:1">.<span style="color:#e8542f">(</span></div>
       <div style="font-size:15px;font-weight:600">${heading}</div>
       <div style="font-size:13px;line-height:1.6;color:#8a8578;max-width:300px">${detail}</div>
       <a href="index" style="margin-top:2px;font-size:12.5px;font-weight:600;color:#141414;text-decoration:none;border-bottom:1.5px solid currentColor;padding-bottom:1px">back to the mark</a>
     </main>`;
};
