/**
 * Next.js config — static export for GitHub Pages.
 *
 * The site is served under a sub-path today (`/HisarCS-mastersite`) but will
 * move to root later. `basePath` is therefore driven by ONE env var: set
 * `NEXT_PUBLIC_BASE_PATH` at build time and every asset/link path follows.
 * When the root changes, change that single value (in the deploy workflow) —
 * nothing in the code hardcodes the path.
 *
 * @type {import('next').NextConfig}
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig = {
  output: 'export', // emit static HTML/CSS/JS to `out/` — no server needed
  basePath, // '' in local dev; '/HisarCS-mastersite' in the Pages build
  assetPrefix: basePath || undefined,
  trailingSlash: true, // directory-style URLs so Pages serves /person/ cleanly
  images: { unoptimized: true }, // no image server in a static export (we optimize client-side)
  reactStrictMode: true,
};

export default nextConfig;
