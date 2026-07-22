# 10,000 (Terning 10 000) solver util — design

Date: 2026-07-22

## Goal

Add a `/utils/tenk` page: an in-browser assistant for playing a real game of
"10,000" (Norwegian dice game, aka Cows). During a turn, you enter the dice
you actually rolled and it tells you what to bank and whether to bank now or
keep rolling. It also tracks your running total toward 10,000 across turns,
and lets you record opponents' scores for context.

This mirrors the existing `/utils/yatzy` page's interaction style (click dice
to cycle 1–6, option-cards ranked by expected value, click to apply), but the
underlying engine is a **new, original TypeScript port**, not vendored WASM —
see "Why not WASM" below.

## Source of truth

The reference implementation is `tenk-solver` (sibling repo,
`~/projects/privat/claude/tenk-solver`), which has two Go solvers already
verified against hand-worked examples:

- `basic/main.go` — standard ruleset, partial-keep banking allowed.
- `houserule/main.go` — this player group's house rules: mandatory banking
  every throw, throw-1+throw-2 combining, no combining from throw 3 on,
  double-triple scoring.

Both use backward-induction DP over `(dice remaining, turn score)`, with turn
score tracked in units of 50. See that repo's `CLAUDE.md` for full rule
details and prior verification notes.

## Why not WASM (unlike Yatzy)

Yatzy's DP table is large enough that it must be solved once (offline, in
C++) and shipped as a pre-baked binary loaded via WASM — solving it live in a
browser tab isn't practical. 10k's entire state space is tiny by comparison:
dice remaining ∈ [1,6], turn score in 50-point units up to a cap (`CAP =
40000` in the Go code, i.e. 800 units) — at most a few thousand states per
ruleset. This solves in milliseconds directly in TypeScript, on the fly, in
the browser. No precompute step, no WASM toolchain, no baked data asset.

## Scope

- `tellewsen.github.io` only. `tenk-solver`'s Go code is untouched and stays
  the canonical reference/verification target. This is a hand-port, not a
  vendored copy — if the Go rules ever change, `src/lib/tenk/` needs manual
  re-porting (no automated sync), same spirit as the yatzy vendoring note in
  this repo's `CLAUDE.md`.
- Both rulesets (basic, house rule), switchable via a toggle on the page.
- Full running-game simulation: turn-by-turn recommendations, running total
  toward 10,000, on-the-board status (1000+ required on the first scoring
  turn), bust/hot-dice handling, simple turn history.
- Opponent score tracking: name + score per opponent, editable, **display
  only** — the recommendation engine stays score-blind with respect to
  opponents, matching the known simplification already documented in
  `tenk-solver/CLAUDE.md` (a fully race-aware policy isn't built yet, in
  either repo).

## Module layout — `src/lib/tenk/`

```
src/lib/tenk/
  scoring.ts          — pure scoring: kindScore(), decompose-style best-combo-for-a-roll
  solverBasic.ts       — port of basic/main.go's DP (V, findThreshold, bust probabilities)
  solverHouserule.ts   — port of houserule/main.go's DP (VA/VB/VC combining-cycle states)
  state.ts             — pure GameState + transitions (see below)
  match.ts             — GameState + opponents list wrapper
  recommend.ts          — turns (state, rolled dice) into ranked/forced recommendation(s)
```

### Memoization: a deliberate change from the Go code

Go's solvers use **global mutable memo maps**, reset via `resetMemos()`
whenever the `threshold` global changes (0 = normal turn, 1000 = still
getting on the board). That's fine for a sequential CLI that always finishes
one `threshold` regime before starting the next, but is a footgun in a
reactive Svelte app where recommendation queries could in principle interleave
across regimes. The TS port avoids it: **no shared mutable memo state**.
Either the memo key includes the threshold explicitly, or each threshold
regime gets its own solver instance. Same algorithm and results, just no
reset-ordering hazard.

## Game state

```ts
interface GameState {
	ruleset: 'basic' | 'houserule';
	onBoard: boolean; // has this player banked 1000+ in a single turn yet
	totalScore: number; // running total toward 10,000
	turnScore: number; // points banked so far this turn
	diceRemaining: number; // dice left to roll this throw
	cyclePhase: 'fresh' | 'combining' | 'independent'; // house rule only; always 'fresh' for basic
	keptForCombining: number[] | null; // house rule only: throw-1 face counts (length-6), cleared after throw 2
	currentRoll: (number | null)[]; // dice just rolled, sized to diceRemaining
	turnHistory: number[]; // banked total per completed turn
}
```

Turn flow (both rulesets):

1. Player enters/rolls `diceRemaining` dice (click-to-cycle 1–6, or "roll
   remaining" — same interaction as the Yatzy page).
2. Bust (zero scoring dice in the roll) → turn forfeited: `turnScore` reset
   to 0, `diceRemaining` reset to 6, `cyclePhase` reset to `'fresh'`.
3. **Basic:** `recommend.ts` returns ranked bank-subset options (partial
   keeps allowed), each `{ bankFaces, points, expectedValue }`, sorted best
   first. Player clicks one to bank it; if any dice remain unbanked, a
   follow-up stop-vs-reroll recommendation is shown (bank-now value vs
   reroll EV, from the same solver call).
4. **House rule:** banking is mandatory — `recommend.ts` computes the forced
   bank via `decompose()` and returns a single forced result: `{
bankedPoints, stopEV, rerollEV, recommend: 'stop' | 'reroll' }`. On throw 1
   of a cycle, `keptForCombining` is stored and `cyclePhase` becomes
   `'combining'`; throw 2 re-scores combined with the kept dice via
   `decompose()`, then `cyclePhase` becomes `'independent'` for throw 3+ (no
   further combining).
5. Hot dice (all 6 dice banked in one throw) resets `diceRemaining` to 6 and
   `cyclePhase` to `'fresh'` without ending the turn.
6. On stop: `totalScore += turnScore`; `onBoard` flips true the first time a
   completed turn's `turnScore >= 1000`; `turnScore` resets to 0;
   `diceRemaining` resets to 6; the banked amount is appended to
   `turnHistory`.

Opponents live on a separate wrapper, not the engine-facing `GameState`:

```ts
interface MatchState {
	self: GameState;
	opponents: { name: string; score: number }[];
}
```

Opponent entries are plain editable fields with no engine involvement.

## Recommendation API

```ts
function getRecommendation(state: GameState, roll: number[]): RecommendationResult;
```

- **Basic:** `{ kind: 'bust' } | { kind: 'options'; options: { bankFaces: number[]; points: number; expectedValue: number }[] }`
- **House rule:** `{ kind: 'bust' } | { kind: 'forced'; bankedPoints: number; stopEV: number; rerollEV: number; recommend: 'stop' | 'reroll' }`

## UI — `src/routes/utils/tenk/+page.svelte`

- Ruleset toggle (Basic / House rule) at the top. Switching resets any
  in-progress turn (the two rulesets have incompatible state shapes
  mid-turn, e.g. `cyclePhase`/`keptForCombining` only make sense for house
  rule).
- Dice row sized to `diceRemaining`, same click-to-cycle-1–6 pip-dice styling
  as the Yatzy page, plus a "roll remaining" button to simulate.
- Recommendation card(s): ranked option-cards for basic (best move starred,
  same visual language as Yatzy's reroll options), or two comparison cards
  (stop vs reroll, with EVs) for house rule.
- Running total toward 10,000, on-the-board status, current turn score.
- Opponents panel: add/remove an opponent, editable score field per
  opponent, purely for display alongside your own progress.
- Turn history: simple list of banked amounts per completed turn.
- "New game" resets everything (own progress, opponents, history).

## Verification

This repo has no test suite by existing convention (`CLAUDE.md`: "No test
suite exists in this project"), so no automated test file is added. Instead,
verification is a manual cross-check during implementation: run the actual
`tenk-solver` Go binaries (`basic/main.go`, `houserule/main.go`) to get
reference numbers — bust probabilities per `n`, bank thresholds per `n`, a
handful of EVs, and the house-rule sanity-check cases already hardcoded in
`houserule/main.go`'s `sanityCheck()` (e.g. one-kept-1 + two-more-1s combining
to a 1000-point triple, double-triple scoring `(triple1+triple2)*2`) — and
confirm the TS port produces matching numbers before considering the port
done. Also manually verified: bust forfeits the whole turn correctly, hot
dice resets without ending the turn, on-the-board threshold gates the first
banked turn only, ruleset toggle correctly resets incompatible mid-turn
state, opponents panel doesn't affect recommendations.

## Out of scope (for this iteration)

- Race-aware recommendations that factor in opponent score (documented
  simplification already noted in `tenk-solver/CLAUDE.md`; opponents here are
  display-only).
- Multiplayer turn-taking / whose-turn-is-it state — this is a solo
  assistant with an informational opponents list, not a full multiplayer
  game engine.
- Any change to `tenk-solver`'s Go code beyond a short README pointer to this
  new util.
