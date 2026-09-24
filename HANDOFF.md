# Handoff: Mastermorphix solver (`/utils/mastermorphix`)

Branch: `feat/mastermorphix`. **Not deployed.** Plan is to finish this
before running `pnpm build && pnpm deploy`.

## Status

Working end to end, with tests: you enter a position, it gets checked, the
solver runs, and you step through the solution. **The UI has only been
checked in two headless-Chromium screenshots**, not by hand. The last change
(default view `rx=-15, ry=0`, `PX=40`) hasn't been looked at at all.

`pnpm test`: 95/95 passed before that view tweak, which doesn't affect the
tests. `pnpm check`: clean.

## What was built

- **`src/lib/cube/geometry.ts`**: slot positions and the rigid rotation of
  each piece, derived from a `CubieCube` (`pieceAt`). Tested against layer
  rotations for all 18 moves.
- **`src/lib/cube/morphix.ts`**: each piece is its 3x3 cell (only the
  internal ±0.5 cuts) clipped by the tetrahedron planes `n·p = 2.25`,
  `n ∈ (±1,±1,±1)` with an odd number of minus signs. From that geometry:
  - 4 tips (3 colours), 4 "triangles" (1 colour, twist invisible), 12 edges
    (1 colour, 4 groups of 3 identical pieces, flip visible), 6 centers
    (2 colours, all 4 orientations visible, like a supercube).
  - Tests check that the pieces plus the core fill the tetrahedron's volume
    exactly, and that each face is 10 patches adding up to its area.
  - `slotLook` / `looksSolved` / `looksSame` compare what a position looks
    like, not the underlying 3x3 state.
  - `checkMorphix(input)` validates an entered position and returns up to N
    reachable 3x3 "candidates" that look identical. It picks a labeling of
    the identical edges (brute force over 6^4) and triangle twists so the
    parity and twist rules hold.
- **Solver (`solver.ts`)**: `centers: true` option.
  - Phase 1 also gets the R/F/L/B centers to even turns.
  - Phase 2 also solves the centers. It uses a 10 MB cornerPerm×centers
    pruning table, built lazily, and skips unreachable phase-2 starts (`-1`
    entries).
  - Phase 2 is capped at 14 moves when solving centers.
  - Fallback: if nothing is found within `giveUpMs` (2 s), pre-scramble with
    10 random moves and join the result via `simplifyMoves`.
  - Benchmarks: random states about 25 moves in about 1 s; "only centers
    wrong" states 18–31 moves, worst case about 5 s.
- `solveBest(cubes, options, budgetMs)` tries several candidates and keeps
  the shortest.
- **`solverClient.ts`**: worker wrapper, with a main-thread fallback for
  tests. **`SolutionSteps.svelte`**: shared step player. The cube page was
  refactored to use both, and its tests are unchanged.
- **`Morphix3D.svelte`**: CSS-3D renderer. Every face of every piece is a
  `button` placed with `matrix3d` and cut with `clip-path`. It has fixed
  lighting, gaps of 0.95, and the selected piece pops out.
- **`/utils/mastermorphix` page**:
  - 4 colour dropdowns, saved in localStorage.
  - Click a piece, or use the "Selected piece" `<select>`, then set the piece
    type/colour with Twist, Flip or Turn.
  - Errors highlight slots. Moves are described by center colours.
  - Linked from the utils index and the cube page.

## Next steps

1. Look at the page in a real browser.
   - Check the default view and model size (`PX` in `Morphix3D.svelte`,
     320 px scene) and phone width.
   - Check that clicking selects the right piece.
   - Check the selected-piece pop-out and the flagged-piece pulse.
2. Try entering a real scrambled Mastermorphix. Entry may be slow or
   confusing:
   - Edges: "Flip" is the only cue. Consider showing both options.
   - Corners: you pick from 8 pieces, then Twist.
3. Ask the user for their puzzle's real colours and set them as the
   defaults (currently red/yellow/green/blue).
4. Optional:
   - Animate turns (the renderer already works per piece, so this is mostly
     interpolating the rotation).
   - Better center-only solving (the fallback adds about 10 moves).
5. Update `CLAUDE.md`. It doesn't mention the Mastermorphix, `geometry.ts`,
   `morphix.ts`, `solverClient.ts` or the centers option yet.
6. Merge to `main`, then `pnpm build && pnpm deploy`.

## Screenshot tooling (outside the repo)

Playwright and headless Chromium were installed in the session scratchpad,
not in the project. To recreate: `npm i playwright` in a temp dir, run
`PLAYWRIGHT_BROWSERS_PATH=... npx playwright install chromium`, then take
screenshots of `pnpm dev`.
