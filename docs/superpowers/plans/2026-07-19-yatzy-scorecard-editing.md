# Editable Scorecard (Mid-Game Resume) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `/utils/yatzy` be started partway through a real, physical game by editing already-scored categories directly, without disturbing the current turn's dice/rerolls.

**Architecture:** A new pure function `setCategoryScore` in `state.ts` updates `categoryScores`/`usedMask`/`upperTotal` only (recomputed from scratch each call), leaving `dice`/`rerollsLeft` untouched — unlike the existing turn-ending `scoreCategory`. A new `scoreValidation.ts` computes each category's real achievable-value set from dice-face combinatorics. The page gets inline click-to-edit number inputs on each scorecard row.

**Tech Stack:** TypeScript, Svelte 5 (SvelteKit), no test framework (repo convention).

## Global Constraints

- `tellewsen.github.io` only — `optimal-yatzy`'s desktop app is unaffected.
- Editing a category must not reset `dice` or `rerollsLeft` — only `scoreCategory()` (unchanged, still used by the recommendation-panel click-to-score flow) does that.
- Entered scores are validated against real Yatzy scoring rules (not just "is a non-negative number") — computed from actual dice-face combinations, not hardcoded value lists.
- No automated tests added — this repo has none by design; verify manually.

---

### Task 1: `setCategoryScore` and `isValidScore`

**Files:**
- Modify: `src/lib/yatzy/state.ts`
- Create: `src/lib/yatzy/scoreValidation.ts`

**Interfaces:**
- Produces: `setCategoryScore(state: GameState, category: number, score: number | null): GameState` (exported from `state.ts`), `isValidScore(category: number, score: number): boolean` (exported from `scoreValidation.ts`) — both consumed by the page in Task 2.

- [ ] **Step 1: Add `setCategoryScore` to `state.ts`**

Add this function after the existing `scoreCategory` function (currently ending at line 87):

```ts
export function setCategoryScore(state: GameState, category: number, score: number | null): GameState {
  const categoryScores = [...state.categoryScores];
  categoryScores[category] = score;
  let usedMask = 0;
  let upperTotal = 0;
  for (let cat = 0; cat < NUM_CATEGORIES; cat++) {
    const s = categoryScores[cat];
    if (s !== null) {
      usedMask |= (1 << cat);
      if (cat < UPPER_CATEGORY_COUNT) upperTotal += s;
    }
  }
  return { ...state, categoryScores, usedMask, upperTotal };
}
```

- [ ] **Step 2: Write `src/lib/yatzy/scoreValidation.ts`**

```ts
// scoreValidation.ts — pure functions validating a manually-entered category
// score against real Yatzy scoring rules (not just "is a non-negative
// number"). Each achievable-value set is computed directly from dice-face
// combinatorics, not hardcoded, so it can't drift out of sync with the
// actual rules.
import { UPPER_CATEGORY_COUNT } from "./state";

export const CatOnePair = 6;
export const CatTwoPairs = 7;
export const CatThreeKind = 8;
export const CatFourKind = 9;
export const CatSmallStraight = 10;
export const CatLargeStraight = 11;
export const CatFullHouse = 12;
export const CatChance = 13;
export const CatYatzy = 14;

function achievableNOfAKind(count: number): Set<number> {
  const values = new Set<number>([0]);
  for (let face = 1; face <= 6; face++) values.add(count * face);
  return values;
}

function achievableTwoPairs(): Set<number> {
  const values = new Set<number>([0]);
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      if (a !== b) values.add(2 * (a + b));
    }
  }
  return values;
}

function achievableFullHouse(): Set<number> {
  const values = new Set<number>([0]);
  for (let triple = 1; triple <= 6; triple++) {
    for (let pair = 1; pair <= 6; pair++) {
      if (triple !== pair) values.add(3 * triple + 2 * pair);
    }
  }
  return values;
}

export function isValidScore(category: number, score: number): boolean {
  if (!Number.isInteger(score) || score < 0) return false;
  if (category < UPPER_CATEGORY_COUNT) {
    const face = category + 1;
    return score % face === 0 && score >= 0 && score <= 5 * face;
  }
  switch (category) {
    case CatOnePair: return achievableNOfAKind(2).has(score);
    case CatTwoPairs: return achievableTwoPairs().has(score);
    case CatThreeKind: return achievableNOfAKind(3).has(score);
    case CatFourKind: return achievableNOfAKind(4).has(score);
    case CatSmallStraight: return score === 0 || score === 15;
    case CatLargeStraight: return score === 0 || score === 20;
    case CatFullHouse: return achievableFullHouse().has(score);
    case CatChance: return score >= 5 && score <= 30;
    case CatYatzy: return score === 0 || score === 50;
    default: return false;
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/ae/projects/privat/claude/tellewsen.github.io
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Manual verification (no test framework in this repo)**

Run a quick Node sanity check against the new pure function before wiring up
the UI. This repo's Node version (v25) runs `.ts` files directly via ESM
`import` with no extra tooling — write a throwaway script (not committed)
and run it directly:

```bash
cat > /tmp/check-score-validation.mjs << 'EOF'
import { isValidScore } from "/home/ae/projects/privat/claude/tellewsen.github.io/src/lib/yatzy/scoreValidation.ts";
console.log("Sixes 18 (valid):", isValidScore(5, 18));
console.log("Sixes 20 (invalid, not multiple of 6):", isValidScore(5, 20));
console.log("Yatzy 50 (valid):", isValidScore(14, 50));
console.log("Yatzy 25 (invalid):", isValidScore(14, 25));
console.log("Chance 17 (valid):", isValidScore(13, 17));
console.log("Chance 4 (invalid, min is 5):", isValidScore(13, 4));
console.log("FullHouse 28 (valid, 6+6+6+5+5):", isValidScore(12, 28));
console.log("FullHouse 29 (invalid):", isValidScore(12, 29));
EOF
node /tmp/check-score-validation.mjs
rm /tmp/check-score-validation.mjs
```

Expected output: `true`, `false`, `true`, `false`, `true`, `false`, `true`, `false` (in order).

- [ ] **Step 5: Commit**

```bash
git add src/lib/yatzy/state.ts src/lib/yatzy/scoreValidation.ts
git commit -m "feat: add setCategoryScore and scoring-rule validation

setCategoryScore edits a category's score directly (recomputing
usedMask/upperTotal from scratch) without resetting dice/rerolls, unlike
the turn-ending scoreCategory. isValidScore checks an entered score is
actually achievable under real Yatzy rules, computed from dice-face
combinatorics rather than hardcoded."
```

---

### Task 2: Inline scorecard editing UI

**Files:**
- Modify: `src/routes/utils/yatzy/+page.svelte`

**Interfaces:**
- Consumes: `setCategoryScore`, `isValidScore` from Task 1.

- [ ] **Step 1: Add imports**

In the `<script>` block, add `setCategoryScore` to the existing `$lib/yatzy/state` import list (after `scoreCategory`):

```ts
	import {
		setDice,
		advanceReroll,
		applyHold,
		rollRemaining,
		scoreCategory,
		setCategoryScore,
		allDiceValid,
		isGameComplete,
		totalScore,
		bonusEarned,
		CATEGORY_NAMES,
		NUM_CATEGORIES
	} from '$lib/yatzy/state';
	import { isValidScore } from '$lib/yatzy/scoreValidation';
```

- [ ] **Step 2: Add editing state and handler**

After the existing `newGame()` function (currently ending at line 137, right before the closing `</script>`), add:

```ts
	let editingCategory: number | null = null;
	let editingValue = '';
	let editingError: string | null = null;

	function startEditingCategory(category: number) {
		editingCategory = category;
		const current = active.categoryScores[category];
		editingValue = current === null ? '' : String(current);
		editingError = null;
	}

	function cancelEditingCategory() {
		editingCategory = null;
		editingValue = '';
		editingError = null;
	}

	function commitEditingCategory() {
		if (editingCategory === null) return;
		const category = editingCategory;
		const trimmed = editingValue.trim();
		if (trimmed === '') {
			const state = activeGameState(match);
			setMatch(withActiveGameState(match, setCategoryScore(state, category, null)));
			cancelEditingCategory();
			if (allDiceValid(activeGameState(match).dice)) void maybeQuery();
			return;
		}
		const parsed = Number(trimmed);
		if (!isValidScore(category, parsed)) {
			editingError = `Not a valid score for ${CATEGORY_NAMES[category]}`;
			return;
		}
		const state = activeGameState(match);
		setMatch(withActiveGameState(match, setCategoryScore(state, category, parsed)));
		cancelEditingCategory();
		if (allDiceValid(activeGameState(match).dice)) void maybeQuery();
	}

	function handleEditingKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') commitEditingCategory();
		else if (event.key === 'Escape') cancelEditingCategory();
	}
```

- [ ] **Step 3: Wire the scorecard rows to the new editing state**

Replace the scorecard `{#each}` block (currently lines 249-254):

```svelte
		{#each Array(NUM_CATEGORIES) as _, cat (cat)}
			<div class="score-row">
				<span>{CATEGORY_NAMES[cat]}</span>
				<span>{active.categoryScores[cat] === null ? '—' : active.categoryScores[cat]}</span>
			</div>
		{/each}
```

with:

```svelte
		{#each Array(NUM_CATEGORIES) as _, cat (cat)}
			<div class="score-row score-row-editable">
				<span>{CATEGORY_NAMES[cat]}</span>
				{#if editingCategory === cat}
					<span class="score-edit-wrapper">
						<input
							class="score-edit-input"
							type="number"
							bind:value={editingValue}
							on:keydown={handleEditingKeydown}
							on:blur={commitEditingCategory}
							use:focusOnMount
						/>
						{#if editingError}<span class="score-edit-error">{editingError}</span>{/if}
					</span>
				{:else}
					<button
						type="button"
						class="score-value-button"
						on:click={() => startEditingCategory(cat)}
					>
						{active.categoryScores[cat] === null ? '—' : active.categoryScores[cat]}
					</button>
				{/if}
			</div>
		{/each}
```

- [ ] **Step 4: Add the `focusOnMount` action**

Svelte doesn't auto-focus a newly-rendered input, so add a tiny action. In the `<script>` block, after the `PIP_LAYOUTS` constant, add:

```ts
	function focusOnMount(node: HTMLInputElement) {
		node.focus();
		node.select();
	}
```

- [ ] **Step 5: Add CSS for the new elements**

In the `<style>` block, after the existing `.score-row.total-row` rule (currently the last rule, ending the file), add:

```css
	.score-row-editable {
		align-items: center;
	}

	.score-value-button {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		color: inherit;
		font-family: inherit;
		font-size: 13px;
		padding: 2px 8px;
		cursor: pointer;
	}

	.score-value-button:hover {
		border-color: var(--border);
		background: var(--bg2);
	}

	.score-edit-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.score-edit-input {
		width: 64px;
		font-size: 13px;
		padding: 2px 6px;
	}

	.score-edit-error {
		font-size: 11px;
		color: var(--accent3);
	}
```

- [ ] **Step 6: Typecheck**

```bash
cd /home/ae/projects/privat/claude/tellewsen.github.io
pnpm check
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

```bash
pnpm dev
```

Open `/utils/yatzy` in a browser and verify:
- Click an unscored category ("—") → an input appears, focused and selected.
- Type a valid score for that category (e.g. `18` for Sixes) and press Enter → the row shows `18`, "Upper total" updates.
- Click a scored category, clear the input (empty), press Enter → the row reverts to "—", "Upper total" recalculates without it.
- Click a category, type an invalid value for it (e.g. `20` for Sixes, not a multiple of 6) and press Enter → an inline error appears, the input stays open, no state change.
- Press Escape while editing → the edit is discarded, no state change.
- Click elsewhere (blur) while a valid value is typed → it commits, same as Enter.
- Fill all five dice first (so a recommendation is showing), then edit an unrelated category → confirm the recommendation panel re-computes (briefly shows "Computing recommendation…" then updates) rather than staying stale.
- Confirm editing a category never resets the current dice or rerolls-left indicator.

- [ ] **Step 8: Commit**

```bash
git add src/routes/utils/yatzy/+page.svelte
git commit -m "feat: inline scorecard editing for mid-game resume

Click any scorecard row to edit it directly — validated against real
Yatzy scoring rules, doesn't disturb the current turn's dice/rerolls.
Lets the page be started partway through a real game."
```

---

## Self-Review Notes

- **Spec coverage:** `setCategoryScore` (recompute usedMask/upperTotal, leave dice/rerolls alone) → Task 1 Step 1. `isValidScore` per-category rules → Task 1 Step 2. Inline click-to-edit UI, Enter/blur/Escape, empty-clears, inline error, re-query on edit if dice filled → Task 2.
- **No placeholders:** every step has literal code.
- **Type consistency:** `setCategoryScore(state: GameState, category: number, score: number | null): GameState` and `isValidScore(category: number, score: number): boolean` signatures match between Task 1's definitions and Task 2's call sites.
