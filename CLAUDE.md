# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build static site to /build
pnpm preview      # Preview production build
pnpm check        # Run svelte-check (TypeScript + Svelte type checking)
pnpm deploy       # Deploy /build to GitHub Pages via gh-pages
```

No test suite exists in this project.

## Architecture

This is a **SvelteKit static site** (adapter-static) deployed to GitHub Pages at a custom domain. The entire site prerenders to static HTML.

### Routing & pages

- `src/routes/+layout.svelte` — top-level layout with `<Nav>` and `<slot />`
- `src/routes/+page.svelte` — home page
- `src/routes/posts/` — blog section; `+page.ts` auto-discovers all post subdirectories
- `src/routes/utils/` — small browser-based utility tools (b64, bmi, cidr, fnr, jwt, qr, uuid)
- `src/routes/about/` — empty directory (about page not yet created)

### Blog post pattern

Each post lives in `src/routes/posts/YYYYMMDD/`:
- `+page.js` — exports a `load()` that returns `{ metadata: { title, date } }` (date as ISO string). This is how the post index discovers and sorts posts.
- `+page.svelte` — imports `Timestamp` from `$lib`, renders `data.metadata.title` and `data.metadata.date`.

The post index (`src/routes/posts/+page.ts`) uses `import.meta.glob('./*/+page.js')` to discover all posts dynamically and sorts them by date descending.

### Shared components (`src/lib/`)

- `Nav.svelte` — site navigation bar
- `Timestamp.svelte` — formats ISO date strings (uses `moment`)
- `FnrGenerator.svelte` — Norwegian FNR (personnummer) generator widget, used by the `/utils/fnr` page

### Static assets

- `static/favicon.svg`
- `static/CNAME` — custom domain config for GitHub Pages

### Key config

- `svelte.config.js` — uses `adapter-static`, renames `_app` to `internal` (avoids GitHub Pages Jekyll processing), base path is `''` for custom domain
- Prettier: tabs, single quotes, no trailing commas
