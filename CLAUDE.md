# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build static site to /build
pnpm preview      # Preview production build
pnpm check        # Run svelte-check (TypeScript + Svelte type checking)
pnpm deploy       # verify + build, then publish /build to GitHub Pages via gh-pages
pnpm test          # Run the test suite once
pnpm test:watch    # Run tests in watch mode
pnpm format        # Format everything with prettier
pnpm lint          # Check formatting (prettier --check)
pnpm verify        # lint + check + test
```

**Deploying:** `pnpm deploy` runs `pnpm verify` and `pnpm build` before
publishing, and stops if either fails. Nothing else enforces formatting (no
pre-commit hook, no CI), so run `pnpm format` before committing or deploy
will refuse. Deploy only after the latest commit is pushed.

Test suite: Vitest, covering src/lib/tenk/ and src/lib/cube/ (pure logic)
plus component tests for /utils/tenk, /utils/cube and /utils/mastermorphix. No tests exist yet
for other routes/components.

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
- `src/routes/utils/cube/` — Rubik's cube (3x3) solver: paint a CSS-3D cube
  (`src/lib/cube/Cube3D.svelte`), solve with a native TypeScript port of
  Kociemba's two-phase algorithm running in a Web Worker
  (`solver.worker.ts`, tables built on load in ~0.6s). `src/lib/cube/` is
  layered so shape mods (e.g. the Mastermorphix) only need a new input
  layer: `cubie.ts` models the mechanism (incl. center orientation `ct`,
  used only with the solver's `centers` option), `facelet.ts` is the 3x3 sticker layer,
  `coord.ts` + `solver.ts` are the search. `cubie.test.ts` checks the move
  tables against an independent geometric sticker-rotation model.
- `src/routes/utils/mastermorphix/` — Mastermorphix solver, the first shape
  mod on the `src/lib/cube/` layers. `geometry.ts` gives each slot's
  position and each piece's rigid rotation; `morphix.ts` builds piece shapes
  as 3x3 cells clipped by a tetrahedron and compares positions by _look_
  (`slotLook`), since identical-looking pieces (same-colour side pieces,
  triangle twists) can't be told apart. `checkMorphix` turns an entered look
  into reachable 3x3 candidates; `solver.ts` with `centers: true` also solves
  center orientation (the 2-colour "edges" on the puzzle are 3x3 centers).
  Entry is by picking from `slotOptions` thumbnails (`Morphix3D` with
  `only`). `solverClient.ts` (worker wrapper) and `SolutionSteps.svelte`
  are shared with the cube page. UI text uses puzzle-holder names: tip,
  face center, edge (2-colour), side piece (1-colour) — see `KIND_NAMES`.
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
