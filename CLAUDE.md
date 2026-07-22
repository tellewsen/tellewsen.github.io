# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build static site to /build
pnpm preview      # Preview production build
pnpm check        # Run svelte-check (TypeScript + Svelte type checking)
pnpm deploy       # Deploy /build to GitHub Pages via gh-pages
pnpm test          # Run the test suite once
pnpm test:watch    # Run tests in watch mode
```

**Deploying:** `pnpm deploy` ships whatever is *currently on disk* in `/build`
— it does not rebuild first. Always run `pnpm build` immediately before
`pnpm deploy`, or a stale/incomplete local `build/` gets silently published
(e.g. missing new routes).

Test suite: Vitest, covering src/lib/tenk/ (pure logic — solver golden
values, state transitions, recommendations) and one component test file
for /utils/tenk. No tests exist yet for other routes/components.

## Architecture

This is a **SvelteKit static site** (adapter-static) deployed to GitHub Pages at a custom domain. The entire site prerenders to static HTML.

### Routing & pages

- `src/routes/+layout.svelte` — top-level layout with `<Nav>` and `<slot />`
- `src/routes/+page.svelte` — home page
- `src/routes/posts/` — blog section; `+page.ts` auto-discovers all post subdirectories
- `src/routes/utils/` — small browser-based utility tools (b64, bmi, cidr, fnr, jwt, qr, uuid)
- `src/routes/utils/yatzy/` — optimal-play Yatzy solver. Vendored (copied, not shared via package) from `optimal-yatzy/gui/src/` — pure game-state/match logic plus a WASM build of the C++ solver engine, baked with a pre-solved DP table. Solo mode only. Re-copy `src/lib/yatzy/` manually if the source engine or logic changes; there's no automated sync.
- `src/routes/utils/tenk/` — optimal-play "10,000" (Terning 10 000 / Cows)
  solver. Unlike yatzy, this is a native TypeScript port (see
  `src/lib/tenk/`) solved live in-browser — no WASM/precompute, since the
  state space is small enough to solve in milliseconds. Ported from
  `tenk-solver` (sibling repo); if its Go rules ever change, this needs
  manual re-porting, same as yatzy's vendoring note above.
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
