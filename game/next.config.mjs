/** @type {import('next').NextConfig} */
// GitHub Pages serves static files only, so publishing uses `next build`'s static
// export. That mode is opt-in: `next dev` and the normal `npm run build` (a Node
// server) behave exactly as before unless GITHUB_PAGES=1 is set by CI.
//
// Base path: a project site lives at https://<user>.github.io/<repo>/, so every
// asset and link needs the "/<repo>" prefix. A user site (<user>.github.io) is
// served from the domain root and needs no prefix — it is detected from the repo
// name, and BASE_PATH can override either case explicitly.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isUserSite = repo.toLowerCase().endsWith('.github.io');
const basePath = process.env.BASE_PATH ?? (repo && !isUserSite ? `/${repo}` : '');
const pages = process.env.GITHUB_PAGES === '1';

const nextConfig = {
  reactStrictMode: true,
  // Inlined at build time so plain <a href> links can be prefixed correctly.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(pages
    ? {
        output: 'export',
        trailingSlash: true, // emits /rules/index.html so /rules/ resolves on Pages
        images: { unoptimized: true },
        basePath,
        assetPrefix: basePath || undefined,
      }
    : {}),
};

export default nextConfig;