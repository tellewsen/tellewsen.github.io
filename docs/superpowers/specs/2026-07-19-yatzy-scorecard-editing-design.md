# Editable scorecard for mid-game resume — design

Date: 2026-07-19

## Goal

Let the `/utils/yatzy` Solo solver be started mid-game: the user is already
partway through a real, physical game of Yatzy and wants to enter the
categories already scored so the tool's recommendations account for them,
without resetting dice or rerolls for the turn currently in progress.

## Scope

- `tellewsen.github.io` only. `optimal-yatzy`'s desktop app is unaffected —
  if the same capability is ever wanted there, `state.ts`'s new function
  would need to be manually re-copied, per this repo's existing vendoring
  convention.
- Editing an already-scored (or unscored) category directly, independent of
  the normal "roll → get recommendation → click to score" turn flow.

## Design

### `setCategoryScore` — new pure function in `src/lib/yatzy/state.ts`

```ts
export function setCategoryScore(state: GameState, category: number, score: number | null): GameState {
  const categoryScores = [...state.categoryScores];
  categoryScores[category] = score;
  let usedMask = 0;
  let upperTotal = 0;
  for (let cat = 0; cat < NUM_CATEGORIES; cat++) {
    if (categoryScores[cat] !== null) {
      usedMask |= (1 << cat);
      if (cat < UPPER_CATEGORY_COUNT) upperTotal += categoryScores[cat]!;
    }
  }
  return { ...state, categoryScores, usedMask, upperTotal };
}
```

Unlike the existing `scoreCategory()` (which ends a turn: resets `dice` to
all-null and `rerollsLeft` to 2), this only ever touches `categoryScores`,
`usedMask`, and `upperTotal` — recomputed from scratch off the full
`categoryScores` array each call, so it can't drift out of sync regardless
of edit order. `dice`/`rerollsLeft` are left exactly as they are, since
editing a *past* category must not disturb whatever turn is currently in
progress. Passing `score: null` clears a category back to unscored.

### `isValidScore` — new validation function, `src/lib/yatzy/scoreValidation.ts`

Checks that an entered score is actually achievable under real Yatzy rules
for that category — not just "is a non-negative number." Implemented by
computing each category's real achievable-value set directly from dice-face
combinatorics (not hardcoded guesses), so it stays exactly correct:

- Upper categories (Ones..Sixes, cat 0-5): must be a multiple of `(cat + 1)`,
  between 0 and `5 * (cat + 1)`.
- OnePair/ThreeOfAKind/FourOfAKind: 0, or `count * face` for `face` in 1..6
  (count = 2/3/4 respectively).
- TwoPairs: 0, or `2 * (a + b)` for distinct faces `a > b` in 1..6 (iterate
  all pairs, collect the achievable sums into a Set).
- FullHouse: 0, or `3*a + 2*b` for `a != b` in 1..6 (iterate all
  triple/pair face combinations, collect achievable sums).
- SmallStraight: 0 or 15. LargeStraight: 0 or 20. Yatzy: 0 or 50.
- Chance: any integer 5..30 (min/max possible 5-dice sum).

### UI — `src/routes/utils/yatzy/+page.svelte`

- Click any scorecard row's score cell (whether it shows a number or "—")
  to turn it into a `<input type="number">` inline, pre-filled with the
  current value (empty if unscored).
- **Enter** or **blur**: commit. If `isValidScore` rejects the value, show a
  small inline error under the row and keep the field open for correction
  rather than reverting silently. Leaving the field **empty** on commit
  clears the category (`setCategoryScore(state, category, null)`).
- **Escape**: cancel, discarding the edit, no state change.
- After any successful edit, if dice are already fully filled, re-run
  `maybeQuery()` so a currently-displayed recommendation reflects the
  corrected scorecard (matches the page's existing pattern of re-querying
  after any state-affecting action).
- Reuses the page's existing click-to-edit interaction language (same idea
  as the dice, which already cycle on click) — no new visual paradigm.

## Testing

No automated test added — this repo has no test suite by design (existing
convention, confirmed in its `CLAUDE.md`). Verified manually: enter a mix of
valid/invalid scores across several categories, confirm `usedMask`/
`upperTotal`/bonus-progress update correctly, confirm rejected values show
an inline error and don't corrupt state, confirm dice/rerolls are
unaffected by editing an unrelated category, confirm recommendations
refresh when dice are already filled.
