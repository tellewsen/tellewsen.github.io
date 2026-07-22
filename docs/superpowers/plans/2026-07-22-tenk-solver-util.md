# /utils/tenk (10,000 dice game solver) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/utils/tenk`, an in-browser assistant for playing a real game of "10,000" — enter the dice you rolled, get bank/reroll advice, track your running total toward 10,000 and opponents' scores — with an automated test suite (new to this repo).

**Architecture:** A native TypeScript port of `tenk-solver`'s two Go DP solvers (`basic/main.go`, `houserule/main.go`), solved live in the browser (the state space is tiny — no WASM/precompute needed, unlike `/utils/yatzy`). Pure logic modules (`scoring.ts`, `solverBasic.ts`, `solverHouserule.ts`, `state.ts`, `match.ts`, `recommend.ts`) are unit-tested against golden values captured from the actual Go binaries; a Svelte page (`+page.svelte`) wires them to a dice-and-cards UI matching the Yatzy page's visual language, with component tests via `@testing-library/svelte`.

**Tech Stack:** SvelteKit (existing), TypeScript (existing), Vitest + `@testing-library/svelte` + `@testing-library/jest-dom` + jsdom (new — first test suite in this repo).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-tenk-solver-util-design.md` in this repo (`tellewsen.github.io`).
- Reference implementation (do not modify): `~/projects/privat/claude/tenk-solver/basic/main.go` and `houserule/main.go`.
- Prettier config in this repo: tabs, single quotes, no trailing commas — run `pnpm exec prettier --write <file>` after creating/editing each file.
- New dev dependencies, pinned to versions confirmed available at plan-writing time: `vitest@^4.1.10`, `@testing-library/svelte@^5.4.2`, `@testing-library/jest-dom@^7.0.0`, `jsdom@^29.1.1`.
- Commit style: conventional commits (`type(scope): description`), matching this repo's existing history.
- No change to `tenk-solver`'s Go code beyond a short README pointer (Task 11, separate repo).
- Ruleset toggle resets any in-progress turn — the two rulesets have incompatible mid-turn state shapes (`cyclePhase`/`keptForCombining` only apply to house rule).
- Opponent tracking is display-only — never feeds into the recommendation engine.

---

## Reference golden values (captured from the Go binaries, used throughout the tests below)

Captured by running `cd ~/projects/privat/claude/tenk-solver/basic && go run main.go` and `cd ~/projects/privat/claude/tenk-solver/houserule && go run main.go`:

**Basic:**
- Bust probability by dice rolled: n=1: 0.6667, n=2: 0.4444, n=3: 0.2778, n=4: 0.1574, n=5: 0.0772, n=6: 0.0231
- Bank thresholds once on the board (threshold=0): n=1: 350, n=2: 250, n=3: 450, n=4: 1050, n=5: 3100, n=6: 18100
- EV of a fresh turn once on the board (n=6, aUnits=0, threshold=0): 590.7
- EV of a fresh turn under the entry rule (n=6, aUnits=0, threshold=1000): 483.9

**House rule** (from `houserule/main.go`'s `sanityCheck()` plus its `main()` output):
- Throw-1 one-1 case: `decompose([1,0,2,1,0,2])` → points=100, used=1
- Throw-2 combined into a triple: kept from above + `[2,0,1,1,0,1]` → points=1000, used=3
- Two-ones-total combined (not a triple): kept from above + `[1,0,1,1,0,1]` → points=200, used=2
- Double triple (three 2s + three 5s): `decompose([0,3,0,0,3,0])` → points=1400, used=6
- EV of a fresh turn once on the board (VA(0), threshold=0): 845.6
- Fresh-cycle bank threshold once on the board: 18400
- EV of a fresh turn under the entry rule (VA(0), threshold=1000): 803.9

---

### Task 1: Add Vitest test tooling

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `vitest-setup.ts`

**Interfaces:**
- Produces: `pnpm test` (single run) and `pnpm test:watch` (watch mode) scripts available to every later task's test steps.

- [ ] **Step 1: Add dev dependencies**

```bash
cd /home/ae/projects/privat/claude/tellewsen.github.io
pnpm add -D vitest@^4.1.10 @testing-library/svelte@^5.4.2 @testing-library/jest-dom@^7.0.0 jsdom@^29.1.1
```

- [ ] **Step 2: Update `vite.config.ts`**

Replace the entire file with:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	test: {
		environment: 'node',
		setupFiles: ['./vitest-setup.ts']
	}
});
```

- [ ] **Step 3: Create `vitest-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add `test` and `test:watch` scripts to `package.json`**

In the `"scripts"` block, add (after `"preview"`):

```json
		"test": "vitest run",
		"test:watch": "vitest",
```

- [ ] **Step 5: Verify the test runner works with no test files yet**

Run: `pnpm test`
Expected: exits 0, reporting "No test files found" (or similar) — confirms Vitest, the SvelteKit plugin, and the setup file all load without error.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts vitest-setup.ts
git commit -m "chore: add Vitest test tooling

First test suite in this repo. Needed for the /utils/tenk solver port,
which introduces golden-value regression tests for the ported DP logic."
```

---

### Task 2: `scoring.ts` — shared pure scoring logic

**Files:**
- Create: `src/lib/tenk/scoring.ts`
- Test: `src/lib/tenk/scoring.test.ts`

**Interfaces:**
- Produces:
  - `kindScore(face: number, groupSize: number): number`
  - `countsFromDice(dice: number[]): number[]`
  - `interface RollOutcome { prob: number; counts: number[] }`
  - `generateRollOutcomes(n: number): RollOutcome[]`
  - `interface Candidate { points: number; banked: number[] }`
  - `bestCandidatesForCounts(counts: number[]): Map<number, Candidate>`
- Consumes: nothing (leaf module).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { kindScore, countsFromDice, generateRollOutcomes, bestCandidatesForCounts } from './scoring';

describe('kindScore', () => {
	it('scores a triple of 1s as 1000', () => {
		expect(kindScore(1, 3)).toBe(1000);
	});

	it('scores a triple of value v as v*100 for v != 1', () => {
		expect(kindScore(4, 3)).toBe(400);
	});

	it('doubles per extra die beyond three of a kind', () => {
		expect(kindScore(4, 4)).toBe(800);
		expect(kindScore(4, 5)).toBe(1600);
		expect(kindScore(4, 6)).toBe(3200);
	});
});

describe('countsFromDice', () => {
	it('tallies face counts', () => {
		expect(countsFromDice([1, 1, 5, 3, 3, 3])).toEqual([2, 0, 3, 0, 1, 0]);
	});
});

describe('generateRollOutcomes', () => {
	it('probabilities for n dice sum to 1', () => {
		for (let n = 1; n <= 6; n++) {
			const total = generateRollOutcomes(n).reduce((sum, o) => sum + o.prob, 0);
			expect(total).toBeCloseTo(1, 9);
		}
	});
});

describe('bestCandidatesForCounts', () => {
	it('finds no candidates for a non-scoring roll', () => {
		const candidates = bestCandidatesForCounts([0, 2, 1, 1, 0, 0]);
		expect(candidates.size).toBe(0);
	});

	it('finds single-1 and single-5 candidates and their combination', () => {
		const candidates = bestCandidatesForCounts([1, 0, 0, 0, 1, 0]);
		expect(candidates.get(1)?.points).toBe(100);
		expect(candidates.get(2)?.points).toBe(150);
	});

	it('recognizes a straight for a genuine 6-dice roll', () => {
		const candidates = bestCandidatesForCounts([1, 1, 1, 1, 1, 1]);
		expect(candidates.get(6)?.points).toBe(2000);
	});

	it('recognizes three pairs for a genuine 6-dice roll', () => {
		const candidates = bestCandidatesForCounts([2, 2, 0, 0, 2, 0]);
		expect(candidates.get(6)?.points).toBe(1500);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test scoring`
Expected: FAIL — `scoring.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/scoring.ts`**

```ts
// scoring.ts — pure scoring shared by both rulesets: point value for a
// face/group-size combo, dice-roll combinatorics (all outcomes of
// rolling n dice with their probabilities), and basic-ruleset candidate
// search (the best points achievable for every possible number of dice
// banked from an actual roll).

export function kindScore(face: number, groupSize: number): number {
	const base = face === 1 ? 1000 : face * 100;
	switch (groupSize) {
		case 3:
			return base;
		case 4:
			return base * 2;
		case 5:
			return base * 4;
		case 6:
			return base * 8;
		default:
			return 0;
	}
}

export function countsFromDice(dice: number[]): number[] {
	const counts = [0, 0, 0, 0, 0, 0];
	for (const d of dice) counts[d - 1] += 1;
	return counts;
}

export interface RollOutcome {
	prob: number;
	counts: number[]; // length 6; counts[i] = number of (i+1)s rolled
}

function factorial(x: number): number {
	let r = 1;
	for (let i = 2; i <= x; i++) r *= i;
	return r;
}

function pow6(n: number): number {
	let r = 1;
	for (let i = 0; i < n; i++) r *= 6;
	return r;
}

const outcomesByNCache = new Map<number, RollOutcome[]>();

export function generateRollOutcomes(n: number): RollOutcome[] {
	const cached = outcomesByNCache.get(n);
	if (cached) return cached;
	const outcomes: RollOutcome[] = [];
	const counts = [0, 0, 0, 0, 0, 0];
	function rec(face: number, remaining: number) {
		if (face === 6) {
			if (remaining === 0) {
				let prob = factorial(n);
				for (const c of counts) prob /= factorial(c);
				prob /= pow6(n);
				outcomes.push({ prob, counts: [...counts] });
			}
			return;
		}
		for (let c = 0; c <= remaining; c++) {
			counts[face] = c;
			rec(face + 1, remaining - c);
		}
		counts[face] = 0;
	}
	rec(0, n);
	outcomesByNCache.set(n, outcomes);
	return outcomes;
}

export interface Candidate {
	points: number;
	banked: number[]; // length 6; dice used per face to achieve `points` with sum(banked) dice
}

export function bestCandidatesForCounts(counts: number[]): Map<number, Candidate> {
	interface Opt {
		used: number;
		points: number;
	}
	const faceOpts: Opt[][] = [];
	for (let idx = 0; idx < 6; idx++) {
		const face = idx + 1;
		const c = counts[idx];
		const opts: Opt[] = [{ used: 0, points: 0 }];
		if (face === 1 || face === 5) {
			const unit = face === 5 ? 50 : 100;
			for (let used = 1; used <= c; used++) {
				const points = used >= 3 ? kindScore(face, used) : unit * used;
				opts.push({ used, points });
			}
		} else {
			for (const g of [3, 4, 5, 6]) {
				if (g <= c) opts.push({ used: g, points: kindScore(face, g) });
			}
		}
		faceOpts.push(opts);
	}

	const best = new Map<number, Candidate>();
	const chosen = [0, 0, 0, 0, 0, 0];
	function rec(face: number, usedSoFar: number, pointsSoFar: number) {
		if (face === 6) {
			if (usedSoFar > 0) {
				const cur = best.get(usedSoFar);
				if (cur === undefined || pointsSoFar > cur.points) {
					best.set(usedSoFar, { points: pointsSoFar, banked: [...chosen] });
				}
			}
			return;
		}
		for (const opt of faceOpts[face]) {
			chosen[face] = opt.used;
			rec(face + 1, usedSoFar + opt.used, pointsSoFar + opt.points);
		}
		chosen[face] = 0;
	}
	rec(0, 0, 0);

	const sum = counts.reduce((a, b) => a + b, 0);
	if (sum === 6) {
		if (counts.every((c) => c === 1)) {
			const cur = best.get(6);
			if (cur === undefined || 2000 > cur.points) {
				best.set(6, { points: 2000, banked: [...counts] });
			}
		}
		const pairCount = counts.filter((c) => c === 2).length;
		if (counts.every((c) => c === 0 || c === 2) && pairCount === 3) {
			const cur = best.get(6);
			if (cur === undefined || 1500 > cur.points) {
				best.set(6, { points: 1500, banked: [...counts] });
			}
		}
	}
	return best;
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/scoring.ts src/lib/tenk/scoring.test.ts
pnpm test scoring
```

Expected: PASS (all tests in `scoring.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/scoring.ts src/lib/tenk/scoring.test.ts
git commit -m "feat(tenk): add shared scoring logic

Pure port of the scoring/combinatorics helpers shared by both
tenk-solver rulesets: point values, dice-roll probability enumeration,
and best-banking-combo search for an actual roll."
```

---

### Task 3: `solverBasic.ts` — basic-ruleset value function

**Files:**
- Create: `src/lib/tenk/solverBasic.ts`
- Test: `src/lib/tenk/solverBasic.test.ts`

**Interfaces:**
- Consumes: `bestCandidatesForCounts`, `generateRollOutcomes` from `./scoring` (Task 2).
- Produces:
  - `value(n: number, aUnits: number, threshold: number): number`
  - `decisionComponents(n: number, aUnits: number, threshold: number): { bankVal: number; rerollVal: number }`
  - `bankThreshold(n: number, threshold: number): number`
  - `bustProbability(n: number): number`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/solverBasic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { value, bankThreshold, bustProbability } from './solverBasic';

describe('solverBasic — matches tenk-solver/basic/main.go reference output', () => {
	it('bust probability by dice rolled', () => {
		expect(bustProbability(1)).toBeCloseTo(0.6667, 4);
		expect(bustProbability(2)).toBeCloseTo(0.4444, 4);
		expect(bustProbability(3)).toBeCloseTo(0.2778, 4);
		expect(bustProbability(4)).toBeCloseTo(0.1574, 4);
		expect(bustProbability(5)).toBeCloseTo(0.0772, 4);
		expect(bustProbability(6)).toBeCloseTo(0.0231, 4);
	});

	it('bank thresholds once already on the board (threshold=0)', () => {
		expect(bankThreshold(1, 0)).toBe(350);
		expect(bankThreshold(2, 0)).toBe(250);
		expect(bankThreshold(3, 0)).toBe(450);
		expect(bankThreshold(4, 0)).toBe(1050);
		expect(bankThreshold(5, 0)).toBe(3100);
		expect(bankThreshold(6, 0)).toBe(18100);
	});

	it('EV of a fresh turn once on the board', () => {
		expect(value(6, 0, 0)).toBeCloseTo(590.7, 1);
	});

	it('EV of a fresh turn under the 1000-point entry rule', () => {
		expect(value(6, 0, 1000)).toBeCloseTo(483.9, 1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test solverBasic`
Expected: FAIL — `solverBasic.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/solverBasic.ts`**

```ts
// solverBasic.ts — port of tenk-solver/basic/main.go's backward-induction
// solver: value function V(dice remaining, turn score, entry threshold),
// bank thresholds, and bust probabilities. Memoization is keyed by
// threshold explicitly (unlike the Go code's global `resetMemos()`
// pattern) so regimes never need resetting or risk cross-contamination.
import { bestCandidatesForCounts, generateRollOutcomes, type Candidate } from './scoring';

const CAP = 40000;

interface BasicOutcome {
	prob: number;
	isBust: boolean;
	candidates: Map<number, Candidate>;
}

const outcomesCache = new Map<number, BasicOutcome[]>();

function outcomesByN(n: number): BasicOutcome[] {
	const cached = outcomesCache.get(n);
	if (cached) return cached;
	const outcomes = generateRollOutcomes(n).map((roll) => {
		const candidates = bestCandidatesForCounts(roll.counts);
		return { prob: roll.prob, isBust: candidates.size === 0, candidates };
	});
	outcomesCache.set(n, outcomes);
	return outcomes;
}

interface ValueComponents {
	bankVal: number;
	rerollVal: number;
	best: number;
}

const memo = new Map<string, ValueComponents>();

function memoKey(n: number, aUnits: number, threshold: number): string {
	return `${n}|${aUnits}|${threshold}`;
}

function computeComponents(n: number, aUnits: number, threshold: number): ValueComponents {
	const a = aUnits * 50;
	if (a >= CAP) return { bankVal: a, rerollVal: -Infinity, best: a };
	const key = memoKey(n, aUnits, threshold);
	const cached = memo.get(key);
	if (cached) return cached;
	let rerollVal = 0;
	for (const outcome of outcomesByN(n)) {
		if (outcome.isBust) continue;
		let best = -Infinity;
		for (const [diceUsed, candidate] of outcome.candidates) {
			const remaining = n - diceUsed;
			const nPrime = remaining === 0 ? 6 : remaining;
			const v = computeComponents(nPrime, aUnits + candidate.points / 50, threshold).best;
			if (v > best) best = v;
		}
		rerollVal += outcome.prob * best;
	}
	const bankVal = a >= threshold ? a : 0;
	const result = { bankVal, rerollVal, best: Math.max(bankVal, rerollVal) };
	memo.set(key, result);
	return result;
}

export function value(n: number, aUnits: number, threshold: number): number {
	return computeComponents(n, aUnits, threshold).best;
}

export function decisionComponents(
	n: number,
	aUnits: number,
	threshold: number
): { bankVal: number; rerollVal: number } {
	const { bankVal, rerollVal } = computeComponents(n, aUnits, threshold);
	return { bankVal, rerollVal };
}

export function bankThreshold(n: number, threshold: number): number {
	for (let aUnits = 0; aUnits * 50 < CAP; aUnits++) {
		const a = aUnits * 50;
		const bankVal = a < threshold ? 0 : a;
		if (value(n, aUnits, threshold) <= bankVal + 0.001) return a;
	}
	return CAP;
}

export function bustProbability(n: number): number {
	let bp = 0;
	for (const outcome of outcomesByN(n)) {
		if (outcome.isBust) bp += outcome.prob;
	}
	return bp;
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/solverBasic.ts src/lib/tenk/solverBasic.test.ts
pnpm test solverBasic
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/solverBasic.ts src/lib/tenk/solverBasic.test.ts
git commit -m "feat(tenk): add basic-ruleset solver

Port of basic/main.go's DP value function, verified against its actual
output (bust probabilities, bank thresholds, EVs)."
```

---

### Task 4: `solverHouserule.ts` — house-rule three-state DP

**Files:**
- Create: `src/lib/tenk/solverHouserule.ts`
- Test: `src/lib/tenk/solverHouserule.test.ts`

**Interfaces:**
- Consumes: `kindScore`, `generateRollOutcomes`, `RollOutcome` from `./scoring` (Task 2).
- Produces:
  - `interface Decomposition { points: number; used: number; banked: number[] }`
  - `decomposeMandatory(counts: number[]): Decomposition`
  - `valueA(aUnits: number, threshold: number): number`
  - `decisionComponentsA(aUnits: number, threshold: number): { bankVal: number; rerollVal: number }`
  - `decisionComponentsB(n1: number, kept: number[], aUnits: number, threshold: number): { bankVal: number; rerollVal: number }`
  - `decisionComponentsC(n: number, aUnits: number, threshold: number): { bankVal: number; rerollVal: number }`
  - `bankThresholdFreshCycle(threshold: number): number`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/solverHouserule.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { decomposeMandatory, valueA, bankThresholdFreshCycle } from './solverHouserule';

describe('decomposeMandatory — matches houserule/main.go sanityCheck() cases', () => {
	it('throw1 one-1 case', () => {
		const d = decomposeMandatory([1, 0, 2, 1, 0, 2]);
		expect(d.points).toBe(100);
		expect(d.used).toBe(1);
	});

	it('throw2 combined into a triple of 1s', () => {
		const kept = decomposeMandatory([1, 0, 2, 1, 0, 2]).banked;
		const combined = kept.map((c, i) => c + [2, 0, 1, 1, 0, 1][i]);
		const d = decomposeMandatory(combined);
		expect(d.points).toBe(1000);
		expect(d.used).toBe(3);
	});

	it('two-ones-total combined is not yet a triple', () => {
		const kept = decomposeMandatory([1, 0, 2, 1, 0, 2]).banked;
		const combined = kept.map((c, i) => c + [1, 0, 1, 1, 0, 1][i]);
		const d = decomposeMandatory(combined);
		expect(d.points).toBe(200);
		expect(d.used).toBe(2);
	});

	it('throw3 independent (no combining) adds on top of the earlier combined total', () => {
		const ptsC = 1000; // combined result from the previous case
		const d3 = decomposeMandatory([1, 0, 1, 0, 0, 1]);
		expect(d3.points).toBe(100);
		expect(d3.used).toBe(1);
		expect(ptsC + d3.points).toBe(1100);
	});

	it('double triple: three 2s + three 5s', () => {
		const d = decomposeMandatory([0, 3, 0, 0, 3, 0]);
		expect(d.points).toBe(1400);
		expect(d.used).toBe(6);
	});
});

describe('solverHouserule — matches tenk-solver/houserule/main.go reference output', () => {
	it('EV of a fresh turn once on the board', () => {
		expect(valueA(0, 0)).toBeCloseTo(845.6, 1);
	});

	it('fresh-cycle bank threshold once on the board', () => {
		expect(bankThresholdFreshCycle(0)).toBe(18400);
	});

	it('EV of a fresh turn under the 1000-point entry rule', () => {
		expect(valueA(0, 1000)).toBeCloseTo(803.9, 1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test solverHouserule`
Expected: FAIL — `solverHouserule.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/solverHouserule.ts`**

```ts
// solverHouserule.ts — port of tenk-solver/houserule/main.go's
// three-state DP (VA/VB/VC) for the house-rule variant: mandatory
// banking, throw-1+throw-2 combining, no combining from throw 3 on.
// Memoization is keyed by threshold explicitly, same reasoning as
// solverBasic.ts.
import { kindScore, generateRollOutcomes, type RollOutcome } from './scoring';

const CAP = 40000;

export interface Decomposition {
	points: number;
	used: number;
	banked: number[]; // length 6
}

export function decomposeMandatory(counts: number[]): Decomposition {
	const sum = counts.reduce((a, b) => a + b, 0);
	if (sum === 6) {
		if (counts.every((c) => c === 1)) {
			return { points: 2000, used: 6, banked: [...counts] };
		}
		const pairCount = counts.filter((c) => c === 2).length;
		if (counts.every((c) => c === 0 || c === 2) && pairCount === 3) {
			return { points: 1500, used: 6, banked: [...counts] };
		}
		const tripleFaces: number[] = [];
		let validTriples = true;
		counts.forEach((c, i) => {
			if (c === 3) tripleFaces.push(i + 1);
			else if (c !== 0) validTriples = false;
		});
		if (validTriples && tripleFaces.length === 2) {
			const points = (kindScore(tripleFaces[0], 3) + kindScore(tripleFaces[1], 3)) * 2;
			return { points, used: 6, banked: [...counts] };
		}
	}

	let points = 0;
	let used = 0;
	const banked = [0, 0, 0, 0, 0, 0];
	for (let idx = 0; idx < 6; idx++) {
		const face = idx + 1;
		const c = counts[idx];
		if (face === 1 || face === 5) {
			const unit = face === 5 ? 50 : 100;
			points += c >= 3 ? kindScore(face, c) : unit * c;
			used += c;
			banked[idx] = c;
		} else if (c >= 3) {
			points += kindScore(face, c);
			used += c;
			banked[idx] = c;
		}
	}
	return { points, used, banked };
}

const outcomesCache = new Map<number, RollOutcome[]>();

function outcomesByN(n: number): RollOutcome[] {
	const cached = outcomesCache.get(n);
	if (cached) return cached;
	const outcomes = generateRollOutcomes(n);
	outcomesCache.set(n, outcomes);
	return outcomes;
}

interface ValueComponents {
	bankVal: number;
	rerollVal: number;
	best: number;
}

const memoA = new Map<string, ValueComponents>();
const memoB = new Map<string, ValueComponents>();
const memoC = new Map<string, ValueComponents>();

function keyA(aUnits: number, threshold: number): string {
	return `${aUnits}|${threshold}`;
}
function keyB(n1: number, kept: number[], aUnits: number, threshold: number): string {
	return `${n1}|${kept.join(',')}|${aUnits}|${threshold}`;
}
function keyC(n: number, aUnits: number, threshold: number): string {
	return `${n}|${aUnits}|${threshold}`;
}

function componentsA(aUnits: number, threshold: number): ValueComponents {
	const a = aUnits * 50;
	if (a >= CAP) return { bankVal: a, rerollVal: -Infinity, best: a };
	const key = keyA(aUnits, threshold);
	const cached = memoA.get(key);
	if (cached) return cached;
	let rerollVal = 0;
	for (const outcome of outcomesByN(6)) {
		const d = decomposeMandatory(outcome.counts);
		let val: number;
		if (d.used === 0) val = 0;
		else if (d.used === 6) val = componentsA(aUnits + d.points / 50, threshold).best;
		else val = componentsB(6 - d.used, d.banked, aUnits, threshold).best;
		rerollVal += outcome.prob * val;
	}
	const bankVal = a >= threshold ? a : 0;
	const result = { bankVal, rerollVal, best: Math.max(bankVal, rerollVal) };
	memoA.set(key, result);
	return result;
}

function componentsB(n1: number, kept: number[], aUnits: number, threshold: number): ValueComponents {
	const a = aUnits * 50;
	const key = keyB(n1, kept, aUnits, threshold);
	const cached = memoB.get(key);
	if (cached) return cached;
	const d1 = decomposeMandatory(kept);
	const bankVal = a + d1.points >= threshold ? a + d1.points : 0;
	let rerollVal = 0;
	for (const outcome of outcomesByN(n1)) {
		const combined = kept.map((c, i) => c + outcome.counts[i]);
		const dC = decomposeMandatory(combined);
		let val: number;
		if (dC.used === d1.used) val = 0;
		else if (dC.used === 6) val = componentsA(aUnits + dC.points / 50, threshold).best;
		else val = componentsC(6 - dC.used, aUnits + dC.points / 50, threshold).best;
		rerollVal += outcome.prob * val;
	}
	const result = { bankVal, rerollVal, best: Math.max(bankVal, rerollVal) };
	memoB.set(key, result);
	return result;
}

function componentsC(n: number, aUnits: number, threshold: number): ValueComponents {
	const a = aUnits * 50;
	if (a >= CAP) return { bankVal: a, rerollVal: -Infinity, best: a };
	const key = keyC(n, aUnits, threshold);
	const cached = memoC.get(key);
	if (cached) return cached;
	let rerollVal = 0;
	for (const outcome of outcomesByN(n)) {
		const d = decomposeMandatory(outcome.counts);
		let val: number;
		if (d.used === 0) val = 0;
		else if (d.used === n) val = componentsA(aUnits + d.points / 50, threshold).best;
		else val = componentsC(n - d.used, aUnits + d.points / 50, threshold).best;
		rerollVal += outcome.prob * val;
	}
	const bankVal = a >= threshold ? a : 0;
	const result = { bankVal, rerollVal, best: Math.max(bankVal, rerollVal) };
	memoC.set(key, result);
	return result;
}

export function valueA(aUnits: number, threshold: number): number {
	return componentsA(aUnits, threshold).best;
}

export function decisionComponentsA(aUnits: number, threshold: number): { bankVal: number; rerollVal: number } {
	const { bankVal, rerollVal } = componentsA(aUnits, threshold);
	return { bankVal, rerollVal };
}

export function decisionComponentsB(
	n1: number,
	kept: number[],
	aUnits: number,
	threshold: number
): { bankVal: number; rerollVal: number } {
	const { bankVal, rerollVal } = componentsB(n1, kept, aUnits, threshold);
	return { bankVal, rerollVal };
}

export function decisionComponentsC(
	n: number,
	aUnits: number,
	threshold: number
): { bankVal: number; rerollVal: number } {
	const { bankVal, rerollVal } = componentsC(n, aUnits, threshold);
	return { bankVal, rerollVal };
}

export function bankThresholdFreshCycle(threshold: number): number {
	for (let aUnits = 0; aUnits * 50 < CAP; aUnits++) {
		if (valueA(aUnits, threshold) <= aUnits * 50 + 0.001) return aUnits * 50;
	}
	return CAP;
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/solverHouserule.ts src/lib/tenk/solverHouserule.test.ts
pnpm test solverHouserule
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/solverHouserule.ts src/lib/tenk/solverHouserule.test.ts
git commit -m "feat(tenk): add house-rule solver

Port of houserule/main.go's three-state DP (fresh cycle / combining
window / independent throws), verified against its sanityCheck() cases
and main() output."
```

---

### Task 5: `state.ts` — GameState model and transitions

**Files:**
- Create: `src/lib/tenk/state.ts`
- Test: `src/lib/tenk/state.test.ts`

**Interfaces:**
- Consumes: nothing (no solver knowledge — pure state transitions).
- Produces:
  - `type Ruleset = 'basic' | 'houserule'`
  - `type CyclePhase = 'fresh' | 'combining' | 'independent'`
  - `interface GameState { ruleset, onBoard, totalScore, turnScore, diceRemaining, cyclePhase, keptForCombining, turnHistory }`
  - `initialGameState(ruleset: Ruleset): GameState`
  - `applyBust(state: GameState): GameState`
  - `stopTurn(state: GameState): GameState`
  - `applyBank(state: GameState, points: number, diceUsed: number): GameState`
  - `enterCombiningWindow(state: GameState, keptCounts: number[], diceUsed: number): GameState`
  - `resolveCombiningRoll(state: GameState, pointsC: number, usedC: number): GameState`
  - `stopMidCombining(state: GameState, provisionalPoints: number): GameState`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	initialGameState,
	applyBust,
	stopTurn,
	applyBank,
	enterCombiningWindow,
	resolveCombiningRoll,
	stopMidCombining
} from './state';

describe('initialGameState', () => {
	it('starts fresh with 6 dice and no score', () => {
		const state = initialGameState('basic');
		expect(state.ruleset).toBe('basic');
		expect(state.diceRemaining).toBe(6);
		expect(state.turnScore).toBe(0);
		expect(state.totalScore).toBe(0);
		expect(state.onBoard).toBe(false);
		expect(state.cyclePhase).toBe('fresh');
		expect(state.keptForCombining).toBeNull();
		expect(state.turnHistory).toEqual([]);
	});
});

describe('applyBust', () => {
	it('wipes the current turn but keeps totalScore/onBoard/history', () => {
		const before = {
			...initialGameState('basic'),
			totalScore: 2000,
			onBoard: true,
			turnScore: 500,
			diceRemaining: 3
		};
		const after = applyBust(before);
		expect(after.turnScore).toBe(0);
		expect(after.diceRemaining).toBe(6);
		expect(after.cyclePhase).toBe('fresh');
		expect(after.keptForCombining).toBeNull();
		expect(after.totalScore).toBe(2000);
		expect(after.onBoard).toBe(true);
	});
});

describe('stopTurn', () => {
	it('commits turnScore into totalScore and logs turn history', () => {
		const before = { ...initialGameState('basic'), turnScore: 400 };
		const after = stopTurn(before);
		expect(after.totalScore).toBe(400);
		expect(after.turnScore).toBe(0);
		expect(after.turnHistory).toEqual([400]);
		expect(after.onBoard).toBe(false);
	});

	it('flips onBoard once a turn banks 1000+', () => {
		const before = { ...initialGameState('basic'), turnScore: 1200 };
		const after = stopTurn(before);
		expect(after.onBoard).toBe(true);
	});
});

describe('applyBank', () => {
	it('adds points and reduces dice remaining', () => {
		const after = applyBank(initialGameState('basic'), 100, 2);
		expect(after.turnScore).toBe(100);
		expect(after.diceRemaining).toBe(4);
		expect(after.cyclePhase).toBe('fresh');
	});

	it('resets to hot dice (6 remaining, fresh phase) when all dice are used', () => {
		const before = { ...initialGameState('houserule'), diceRemaining: 3, cyclePhase: 'independent' as const };
		const after = applyBank(before, 300, 3);
		expect(after.diceRemaining).toBe(6);
		expect(after.cyclePhase).toBe('fresh');
	});

	it('preserves cyclePhase when not hot dice', () => {
		const before = { ...initialGameState('houserule'), diceRemaining: 4, cyclePhase: 'independent' as const };
		const after = applyBank(before, 100, 1);
		expect(after.diceRemaining).toBe(3);
		expect(after.cyclePhase).toBe('independent');
	});
});

describe('house-rule combining transitions', () => {
	it('enterCombiningWindow stores kept dice without touching turnScore', () => {
		const after = enterCombiningWindow(initialGameState('houserule'), [1, 0, 0, 0, 0, 0], 1);
		expect(after.turnScore).toBe(0);
		expect(after.diceRemaining).toBe(5);
		expect(after.cyclePhase).toBe('combining');
		expect(after.keptForCombining).toEqual([1, 0, 0, 0, 0, 0]);
	});

	it('stopMidCombining commits the provisional points and ends the turn', () => {
		const mid = enterCombiningWindow(initialGameState('houserule'), [1, 0, 0, 0, 0, 0], 1);
		const after = stopMidCombining(mid, 100);
		expect(after.totalScore).toBe(100);
		expect(after.turnScore).toBe(0);
		expect(after.diceRemaining).toBe(6);
		expect(after.cyclePhase).toBe('fresh');
	});

	it('resolveCombiningRoll commits the combined total, ignoring the provisional value', () => {
		const mid = enterCombiningWindow(initialGameState('houserule'), [1, 0, 0, 0, 0, 0], 1);
		const after = resolveCombiningRoll(mid, 1000, 3);
		expect(after.turnScore).toBe(1000);
		expect(after.diceRemaining).toBe(3);
		expect(after.cyclePhase).toBe('independent');
		expect(after.keptForCombining).toBeNull();
	});

	it('resolveCombiningRoll resets to hot dice when the combined roll uses all 6', () => {
		const mid = enterCombiningWindow(initialGameState('houserule'), [1, 0, 0, 0, 0, 0], 1);
		const after = resolveCombiningRoll(mid, 2000, 6);
		expect(after.diceRemaining).toBe(6);
		expect(after.cyclePhase).toBe('fresh');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test state`
Expected: FAIL — `state.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/state.ts`**

```ts
// state.ts — pure GameState model and transitions for a single player's
// progress through a game of 10,000. No solving logic here — see
// recommend.ts, which is the only module that calls into solverBasic /
// solverHouserule and decides what to display.
export type Ruleset = 'basic' | 'houserule';
export type CyclePhase = 'fresh' | 'combining' | 'independent';

export interface GameState {
	ruleset: Ruleset;
	onBoard: boolean;
	totalScore: number;
	turnScore: number;
	diceRemaining: number;
	cyclePhase: CyclePhase;
	keptForCombining: number[] | null;
	turnHistory: number[];
}

export function initialGameState(ruleset: Ruleset): GameState {
	return {
		ruleset,
		onBoard: false,
		totalScore: 0,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null,
		turnHistory: []
	};
}

export function applyBust(state: GameState): GameState {
	return {
		...state,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null
	};
}

export function stopTurn(state: GameState): GameState {
	return {
		...state,
		totalScore: state.totalScore + state.turnScore,
		onBoard: state.onBoard || state.turnScore >= 1000,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null,
		turnHistory: [...state.turnHistory, state.turnScore]
	};
}

export function applyBank(state: GameState, points: number, diceUsed: number): GameState {
	const remaining = state.diceRemaining - diceUsed;
	const hotDice = remaining === 0;
	return {
		...state,
		turnScore: state.turnScore + points,
		diceRemaining: hotDice ? 6 : remaining,
		cyclePhase: hotDice ? 'fresh' : state.cyclePhase,
		keptForCombining: hotDice ? null : state.keptForCombining
	};
}

export function enterCombiningWindow(state: GameState, keptCounts: number[], diceUsed: number): GameState {
	return {
		...state,
		diceRemaining: state.diceRemaining - diceUsed,
		cyclePhase: 'combining',
		keptForCombining: keptCounts
	};
}

export function resolveCombiningRoll(state: GameState, pointsC: number, usedC: number): GameState {
	const remaining = 6 - usedC;
	const hotDice = remaining === 0;
	return {
		...state,
		turnScore: state.turnScore + pointsC,
		diceRemaining: hotDice ? 6 : remaining,
		cyclePhase: hotDice ? 'fresh' : 'independent',
		keptForCombining: null
	};
}

export function stopMidCombining(state: GameState, provisionalPoints: number): GameState {
	return stopTurn({ ...state, turnScore: state.turnScore + provisionalPoints });
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/state.ts src/lib/tenk/state.test.ts
pnpm test state
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/state.ts src/lib/tenk/state.test.ts
git commit -m "feat(tenk): add GameState model and turn transitions

Pure, solver-agnostic state transitions covering bust, stop, mandatory
bank, and the house-rule combining-window lifecycle (enter / resolve /
stop-mid-combining)."
```

---

### Task 6: `match.ts` — opponents wrapper

**Files:**
- Create: `src/lib/tenk/match.ts`
- Test: `src/lib/tenk/match.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Ruleset`, `initialGameState` from `./state` (Task 5).
- Produces:
  - `interface Opponent { name: string; score: number }`
  - `interface MatchState { self: GameState; opponents: Opponent[] }`
  - `initialMatchState(ruleset: Ruleset): MatchState`
  - `addOpponent(match: MatchState, name: string): MatchState`
  - `removeOpponent(match: MatchState, index: number): MatchState`
  - `updateOpponentScore(match: MatchState, index: number, score: number): MatchState`
  - `renameOpponent(match: MatchState, index: number, name: string): MatchState`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialMatchState, addOpponent, removeOpponent, updateOpponentScore, renameOpponent } from './match';

describe('match state', () => {
	it('starts with no opponents', () => {
		const match = initialMatchState('basic');
		expect(match.opponents).toEqual([]);
		expect(match.self.ruleset).toBe('basic');
	});

	it('adds, updates, renames, and removes opponents without touching self', () => {
		let match = initialMatchState('houserule');
		match = addOpponent(match, 'Alice');
		match = addOpponent(match, 'Bob');
		expect(match.opponents.map((o) => o.name)).toEqual(['Alice', 'Bob']);

		match = updateOpponentScore(match, 0, 4500);
		expect(match.opponents[0].score).toBe(4500);
		expect(match.opponents[1].score).toBe(0);

		match = renameOpponent(match, 1, 'Bobby');
		expect(match.opponents[1].name).toBe('Bobby');

		match = removeOpponent(match, 0);
		expect(match.opponents.map((o) => o.name)).toEqual(['Bobby']);
		expect(match.self.ruleset).toBe('houserule');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test match`
Expected: FAIL — `match.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/match.ts`**

```ts
// match.ts — the player's GameState plus a display-only opponents list.
// Opponents never feed into the recommendation engine.
import type { GameState, Ruleset } from './state';
import { initialGameState } from './state';

export interface Opponent {
	name: string;
	score: number;
}

export interface MatchState {
	self: GameState;
	opponents: Opponent[];
}

export function initialMatchState(ruleset: Ruleset): MatchState {
	return { self: initialGameState(ruleset), opponents: [] };
}

export function addOpponent(match: MatchState, name: string): MatchState {
	return { ...match, opponents: [...match.opponents, { name, score: 0 }] };
}

export function removeOpponent(match: MatchState, index: number): MatchState {
	return { ...match, opponents: match.opponents.filter((_, i) => i !== index) };
}

export function updateOpponentScore(match: MatchState, index: number, score: number): MatchState {
	const opponents = match.opponents.map((o, i) => (i === index ? { ...o, score } : o));
	return { ...match, opponents };
}

export function renameOpponent(match: MatchState, index: number, name: string): MatchState {
	const opponents = match.opponents.map((o, i) => (i === index ? { ...o, name } : o));
	return { ...match, opponents };
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/match.ts src/lib/tenk/match.test.ts
pnpm test match
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/match.ts src/lib/tenk/match.test.ts
git commit -m "feat(tenk): add opponents wrapper

Display-only opponent tracking (name + score) alongside the player's
own GameState, per the design's score-blind recommendation engine."
```

---

### Task 7: `recommend.ts` — recommendation API

**Files:**
- Create: `src/lib/tenk/recommend.ts`
- Test: `src/lib/tenk/recommend.test.ts`

**Interfaces:**
- Consumes:
  - `GameState`, `applyBank`, `applyBust`, `enterCombiningWindow`, `resolveCombiningRoll`, `stopMidCombining`, `stopTurn` from `./state` (Task 5)
  - `countsFromDice`, `bestCandidatesForCounts` from `./scoring` (Task 2)
  - `decisionComponents` (aliased `basicDecisionComponents`) from `./solverBasic` (Task 3)
  - `decomposeMandatory`, `decisionComponentsA`, `decisionComponentsB`, `decisionComponentsC` from `./solverHouserule` (Task 4)
- Produces:
  - `interface BasicBankOption { banked, points, diceUsed, stopEV, rerollEV, recommend, expectedValue, onStop: GameState, onReroll: GameState }`
  - `interface HouseruleForced { kind: 'houseruleForced', points, diceUsed, stopEV, rerollEV, recommend, onStop: GameState, onReroll: GameState }`
  - `type RollAdvice = { kind: 'bust'; onAcknowledge: GameState } | { kind: 'basicOptions'; options: BasicBankOption[] } | HouseruleForced`
  - `getRollAdvice(state: GameState, roll: number[]): RollAdvice`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tenk/recommend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialGameState } from './state';
import { getRollAdvice } from './recommend';

describe('getRollAdvice — basic ruleset', () => {
	it('detects a bust (no scoring dice)', () => {
		const state = { ...initialGameState('basic'), onBoard: true };
		const advice = getRollAdvice(state, [2, 2, 3, 4, 6, 6]);
		expect(advice.kind).toBe('bust');
	});

	it('ranks bank options best-EV-first and each option produces a usable next state', () => {
		const state = { ...initialGameState('basic'), onBoard: true };
		const advice = getRollAdvice(state, [1, 1, 5, 2, 3, 4]);
		if (advice.kind !== 'basicOptions') throw new Error('expected basicOptions');
		expect(advice.options.length).toBeGreaterThan(0);
		for (let i = 1; i < advice.options.length; i++) {
			expect(advice.options[i - 1].expectedValue).toBeGreaterThanOrEqual(advice.options[i].expectedValue);
		}
		const best = advice.options[0];
		expect(best.onReroll.turnScore).toBe(best.points);
		expect(best.onStop.totalScore).toBe(best.points);
	});
});

describe('getRollAdvice — house rule ruleset', () => {
	it('detects a bust on a fresh throw', () => {
		const state = { ...initialGameState('houserule'), onBoard: true };
		const advice = getRollAdvice(state, [2, 2, 3, 4, 6, 6]);
		expect(advice.kind).toBe('bust');
	});

	it('enters the combining window on a partial fresh-throw score', () => {
		const state = { ...initialGameState('houserule'), onBoard: true };
		const advice = getRollAdvice(state, [1, 2, 3, 4, 6, 6]);
		if (advice.kind !== 'houseruleForced') throw new Error('expected houseruleForced');
		expect(advice.points).toBe(100);
		expect(advice.diceUsed).toBe(1);
		expect(advice.onReroll.cyclePhase).toBe('combining');
		expect(advice.onReroll.keptForCombining).toEqual([1, 0, 0, 0, 0, 0]);
		expect(advice.onReroll.turnScore).toBe(0);
		expect(advice.onStop.totalScore).toBe(100);
	});

	it('resolves the combining window on the throw-2 roll', () => {
		const state = { ...initialGameState('houserule'), onBoard: true };
		const first = getRollAdvice(state, [1, 2, 3, 4, 6, 6]);
		if (first.kind !== 'houseruleForced') throw new Error('expected houseruleForced');
		const second = getRollAdvice(first.onReroll, [1, 1, 2, 3, 6]);
		if (second.kind !== 'houseruleForced') throw new Error('expected houseruleForced');
		expect(second.points).toBe(1000);
		expect(second.onStop.totalScore).toBe(1000);
	});

	it('busts the whole turn if throw 2 adds no new scoring dice', () => {
		const state = { ...initialGameState('houserule'), onBoard: true };
		const first = getRollAdvice(state, [1, 2, 3, 4, 6, 6]);
		if (first.kind !== 'houseruleForced') throw new Error('expected houseruleForced');
		const second = getRollAdvice(first.onReroll, [2, 3, 4, 6, 6]);
		expect(second.kind).toBe('bust');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test recommend`
Expected: FAIL — `recommend.ts` does not exist yet.

- [ ] **Step 3: Create `src/lib/tenk/recommend.ts`**

```ts
// recommend.ts — the only module that combines GameState with the
// solvers to produce advice for an actual dice roll: what happened
// (bust / forced bank / ranked bank options) and ready-to-apply next
// states for "stop" and "reroll" (or "acknowledge" for a bust), so the
// UI never has to know which state.ts transition applies to which
// situation.
import type { GameState } from './state';
import {
	applyBank,
	applyBust,
	enterCombiningWindow,
	resolveCombiningRoll,
	stopMidCombining,
	stopTurn
} from './state';
import { countsFromDice, bestCandidatesForCounts } from './scoring';
import { decisionComponents as basicDecisionComponents } from './solverBasic';
import {
	decomposeMandatory,
	decisionComponentsA,
	decisionComponentsB,
	decisionComponentsC
} from './solverHouserule';

const ENTRY_THRESHOLD = 1000;

function thresholdFor(state: GameState): number {
	return state.onBoard ? 0 : ENTRY_THRESHOLD;
}

export interface BasicBankOption {
	banked: number[];
	points: number;
	diceUsed: number;
	stopEV: number;
	rerollEV: number;
	recommend: 'stop' | 'reroll';
	expectedValue: number;
	onStop: GameState;
	onReroll: GameState;
}

export interface HouseruleForced {
	kind: 'houseruleForced';
	points: number;
	diceUsed: number;
	stopEV: number;
	rerollEV: number;
	recommend: 'stop' | 'reroll';
	onStop: GameState;
	onReroll: GameState;
}

export type RollAdvice =
	| { kind: 'bust'; onAcknowledge: GameState }
	| { kind: 'basicOptions'; options: BasicBankOption[] }
	| HouseruleForced;

function forced(
	points: number,
	diceUsed: number,
	bankedState: GameState,
	stopEV: number,
	rerollEV: number
): HouseruleForced {
	return {
		kind: 'houseruleForced',
		points,
		diceUsed,
		stopEV,
		rerollEV,
		recommend: stopEV >= rerollEV ? 'stop' : 'reroll',
		onStop: stopTurn(bankedState),
		onReroll: bankedState
	};
}

export function getRollAdvice(state: GameState, roll: number[]): RollAdvice {
	const threshold = thresholdFor(state);
	const counts = countsFromDice(roll);

	if (state.ruleset === 'basic') {
		const candidates = bestCandidatesForCounts(counts);
		if (candidates.size === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };
		const aUnits = state.turnScore / 50;
		const options: BasicBankOption[] = [];
		for (const [diceUsed, candidate] of candidates) {
			const remaining = state.diceRemaining - diceUsed;
			const nPrime = remaining === 0 ? 6 : remaining;
			const { bankVal, rerollVal } = basicDecisionComponents(nPrime, aUnits + candidate.points / 50, threshold);
			const bankedState = applyBank(state, candidate.points, diceUsed);
			options.push({
				banked: candidate.banked,
				points: candidate.points,
				diceUsed,
				stopEV: bankVal,
				rerollEV: rerollVal,
				recommend: bankVal >= rerollVal ? 'stop' : 'reroll',
				expectedValue: Math.max(bankVal, rerollVal),
				onStop: stopTurn(bankedState),
				onReroll: bankedState
			});
		}
		options.sort((a, b) => b.expectedValue - a.expectedValue);
		return { kind: 'basicOptions', options };
	}

	// house rule
	const aUnits = state.turnScore / 50;

	if (state.cyclePhase === 'fresh') {
		const d = decomposeMandatory(counts);
		if (d.used === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };

		if (d.used === 6) {
			const bankedState = applyBank(state, d.points, 6);
			const { bankVal, rerollVal } = decisionComponentsA(aUnits + d.points / 50, threshold);
			return forced(d.points, 6, bankedState, bankVal, rerollVal);
		}

		const n1 = 6 - d.used;
		const { bankVal, rerollVal } = decisionComponentsB(n1, d.banked, aUnits, threshold);
		return {
			kind: 'houseruleForced',
			points: d.points,
			diceUsed: d.used,
			stopEV: bankVal,
			rerollEV: rerollVal,
			recommend: bankVal >= rerollVal ? 'stop' : 'reroll',
			onStop: stopMidCombining(state, d.points),
			onReroll: enterCombiningWindow(state, d.banked, d.used)
		};
	}

	if (state.cyclePhase === 'combining') {
		const kept = state.keptForCombining!;
		const used1 = decomposeMandatory(kept).used;
		const combined = kept.map((c, i) => c + counts[i]);
		const d = decomposeMandatory(combined);
		if (d.used === used1) return { kind: 'bust', onAcknowledge: applyBust(state) };

		const bankedState = resolveCombiningRoll(state, d.points, d.used);
		const newAUnits = aUnits + d.points / 50;
		const { bankVal, rerollVal } =
			d.used === 6
				? decisionComponentsA(newAUnits, threshold)
				: decisionComponentsC(6 - d.used, newAUnits, threshold);
		return forced(d.points, d.used, bankedState, bankVal, rerollVal);
	}

	// independent phase (throw 3+)
	const d = decomposeMandatory(counts);
	if (d.used === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };
	const bankedState = applyBank(state, d.points, d.used);
	const newAUnits = aUnits + d.points / 50;
	const { bankVal, rerollVal } =
		d.used === state.diceRemaining
			? decisionComponentsA(newAUnits, threshold)
			: decisionComponentsC(state.diceRemaining - d.used, newAUnits, threshold);
	return forced(d.points, d.used, bankedState, bankVal, rerollVal);
}
```

- [ ] **Step 4: Format and run tests to verify they pass**

```bash
pnpm exec prettier --write src/lib/tenk/recommend.ts src/lib/tenk/recommend.test.ts
pnpm test recommend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenk/recommend.ts src/lib/tenk/recommend.test.ts
git commit -m "feat(tenk): add recommendation API

Combines GameState with both solvers to turn an actual dice roll into
UI-ready advice: bust / ranked bank options (basic) / forced
stop-or-reroll decision (house rule), each carrying the exact next
GameState for stop and reroll."
```

---

### Task 8: `+page.svelte` — the UI

**Files:**
- Create: `src/routes/utils/tenk/+page.svelte`

**Interfaces:**
- Consumes: everything from Tasks 2–7 (`state.ts`, `match.ts`, `recommend.ts`).

- [ ] **Step 1: Create `src/routes/utils/tenk/+page.svelte`**

```svelte
<script lang="ts">
	import { type GameState, type Ruleset } from '$lib/tenk/state';
	import {
		initialMatchState,
		addOpponent,
		removeOpponent,
		updateOpponentScore,
		type MatchState
	} from '$lib/tenk/match';
	import { getRollAdvice, type RollAdvice, type BasicBankOption } from '$lib/tenk/recommend';

	const PIP_LAYOUTS: Record<number, string[]> = {
		1: ['mc'],
		2: ['tl', 'br'],
		3: ['tl', 'mc', 'br'],
		4: ['tl', 'tr', 'bl', 'br'],
		5: ['tl', 'tr', 'mc', 'bl', 'br'],
		6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br']
	};

	let match: MatchState = initialMatchState('basic');
	let advice: RollAdvice | null = null;
	let selectedOption: BasicBankOption | null = null;
	let currentRoll: (number | null)[] = Array(6).fill(null);

	function setRuleset(ruleset: Ruleset) {
		match = initialMatchState(ruleset);
		resetRollInput();
	}

	function allDiceEntered(roll: (number | null)[], n: number): roll is number[] {
		return roll.slice(0, n).every((d) => d !== null);
	}

	function maybeAdvise() {
		const n = match.self.diceRemaining;
		if (!allDiceEntered(currentRoll, n)) {
			advice = null;
			selectedOption = null;
			return;
		}
		advice = getRollAdvice(match.self, currentRoll.slice(0, n) as number[]);
		selectedOption = null;
	}

	function handleDieClick(index: number) {
		const current = currentRoll[index];
		currentRoll[index] = current === null ? 1 : (current % 6) + 1;
		currentRoll = [...currentRoll];
		maybeAdvise();
	}

	function handleRollRemaining() {
		const n = match.self.diceRemaining;
		currentRoll = currentRoll.map((d, i) => (i < n ? Math.floor(Math.random() * 6) + 1 : null));
		maybeAdvise();
	}

	function resetRollInput() {
		currentRoll = Array(6).fill(null);
		advice = null;
		selectedOption = null;
	}

	function applySelf(next: GameState) {
		match = { ...match, self: next };
		resetRollInput();
	}

	function handleBustAcknowledge() {
		if (advice?.kind === 'bust') applySelf(advice.onAcknowledge);
	}

	function handleBasicOptionClick(option: BasicBankOption) {
		selectedOption = option;
	}

	function handleForcedStop() {
		if (advice?.kind === 'houseruleForced') applySelf(advice.onStop);
	}

	function handleForcedReroll() {
		if (advice?.kind === 'houseruleForced') applySelf(advice.onReroll);
	}

	function handleOptionStop() {
		if (selectedOption) applySelf(selectedOption.onStop);
	}

	function handleOptionReroll() {
		if (selectedOption) applySelf(selectedOption.onReroll);
	}

	function handleAddOpponent() {
		match = addOpponent(match, `Player ${match.opponents.length + 2}`);
	}

	function handleRemoveOpponent(index: number) {
		match = removeOpponent(match, index);
	}

	function handleOpponentScoreChange(index: number, value: string) {
		const score = Number(value);
		if (!Number.isNaN(score)) match = updateOpponentScore(match, index, score);
	}

	function handleNewGame() {
		match = initialMatchState(match.self.ruleset);
		resetRollInput();
	}
</script>

<svelte:head>
	<title>10,000 solver — ellewsen.no</title>
</svelte:head>

<section class="tenk">
	<div class="section-label">// utils / tenk</div>

	<p class="intro">
		Optimal-play assistant for "10,000" (Terning 10 000 / Cows). Roll physical dice and enter the
		values below (click a die to cycle 1–6), or use "Roll remaining" to simulate a roll. Runs
		entirely in your browser — nothing is sent anywhere.
	</p>

	<div class="card ruleset-card">
		<button
			type="button"
			class="btn btn-secondary"
			class:btn-active={match.self.ruleset === 'basic'}
			on:click={() => setRuleset('basic')}>Basic</button
		>
		<button
			type="button"
			class="btn btn-secondary"
			class:btn-active={match.self.ruleset === 'houserule'}
			on:click={() => setRuleset('houserule')}>House rule</button
		>
	</div>

	<div class="card dice-card">
		<div class="dice-row">
			{#each Array(match.self.diceRemaining) as _, i (i)}
				<button
					type="button"
					class="die"
					class:die-empty={currentRoll[i] === null}
					aria-label={currentRoll[i] === null ? `Die ${i + 1}, empty` : `Die ${i + 1}, value ${currentRoll[i]}`}
					on:click={() => handleDieClick(i)}
				>
					{#if currentRoll[i] !== null}
						{#each PIP_LAYOUTS[currentRoll[i] as number] as pos}
							<span class="pip pip-{pos}"></span>
						{/each}
					{/if}
				</button>
			{/each}
		</div>
		<div class="dice-actions">
			<button type="button" class="btn btn-secondary" on:click={handleRollRemaining}>Roll remaining</button>
			<button type="button" class="btn btn-secondary" on:click={resetRollInput}>Clear</button>
			<button type="button" class="btn btn-secondary" on:click={handleNewGame}>New game</button>
		</div>
	</div>

	<div class="card recommendation-card">
		{#if advice === null}
			<p class="hint">Enter all {match.self.diceRemaining} dice to see a recommendation.</p>
		{:else if advice.kind === 'bust'}
			<p class="bust-message">Bust! This turn's points are forfeited.</p>
			<button type="button" class="btn btn-secondary" on:click={handleBustAcknowledge}>Continue</button>
		{:else if advice.kind === 'basicOptions'}
			{#if !selectedOption}
				{#each advice.options as option, index (option.banked.join(','))}
					<button
						type="button"
						class="option-card"
						class:best-option={index === 0}
						on:click={() => handleBasicOptionClick(option)}
					>
						{#if index === 0}<span class="best-badge">★ Best move</span>{/if}
						<span class="option-text">
							Bank {option.diceUsed} {option.diceUsed === 1 ? 'die' : 'dice'} for {option.points} pts
							(expected value {option.expectedValue.toFixed(1)})
						</span>
					</button>
				{/each}
			{:else}
				<p class="hint">
					Banked {selectedOption.points} pts. Turn total: {match.self.turnScore + selectedOption.points}.
				</p>
				<button
					type="button"
					class="option-card"
					class:best-option={selectedOption.recommend === 'stop'}
					on:click={handleOptionStop}
				>
					Stop — bank {match.self.turnScore + selectedOption.points} pts (EV {selectedOption.stopEV.toFixed(1)})
				</button>
				<button
					type="button"
					class="option-card"
					class:best-option={selectedOption.recommend === 'reroll'}
					on:click={handleOptionReroll}
				>
					Reroll remaining dice (EV {selectedOption.rerollEV.toFixed(1)})
				</button>
			{/if}
		{:else}
			<p class="hint">Mandatory bank: {advice.points} pts ({advice.diceUsed} dice).</p>
			<button
				type="button"
				class="option-card"
				class:best-option={advice.recommend === 'stop'}
				on:click={handleForcedStop}
			>
				Stop — bank turn (EV {advice.stopEV.toFixed(1)})
			</button>
			<button
				type="button"
				class="option-card"
				class:best-option={advice.recommend === 'reroll'}
				on:click={handleForcedReroll}
			>
				Reroll remaining dice (EV {advice.rerollEV.toFixed(1)})
			</button>
		{/if}
	</div>

	<div class="card status-card">
		<div class="score-row"><strong>Total score</strong><span>{match.self.totalScore} / 10,000</span></div>
		<div class="score-row">
			<strong>On the board</strong><span>{match.self.onBoard ? 'yes' : 'no (need 1000+ in one turn)'}</span>
		</div>
		<div class="score-row"><strong>Turn score so far</strong><span>{match.self.turnScore}</span></div>
	</div>

	<div class="card opponents-card">
		<div class="section-label">// opponents</div>
		{#each match.opponents as opponent, index (index)}
			<div class="score-row">
				<span>{opponent.name}</span>
				<span class="opponent-controls">
					<input
						type="number"
						inputmode="numeric"
						value={opponent.score}
						on:input={(e) => handleOpponentScoreChange(index, e.currentTarget.value)}
					/>
					<button
						type="button"
						class="die-clear"
						aria-label={`Remove ${opponent.name}`}
						on:click={() => handleRemoveOpponent(index)}>×</button
					>
				</span>
			</div>
		{/each}
		<button type="button" class="btn btn-secondary" on:click={handleAddOpponent}>Add opponent</button>
	</div>

	<div class="card history-card">
		<div class="section-label">// turn history</div>
		{#if match.self.turnHistory.length === 0}
			<p class="hint">No completed turns yet.</p>
		{:else}
			<ol class="history-list">
				{#each match.self.turnHistory as banked, index (index)}
					<li>Turn {index + 1}: {banked} pts</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<style>
	.tenk {
		padding: 56px 0;
	}
	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 640px;
	}
	.card {
		margin-bottom: 16px;
	}
	.ruleset-card {
		display: flex;
		gap: 8px;
	}
	.btn-active {
		border-color: var(--accent);
		color: var(--accent);
	}
	.dice-row {
		display: flex;
		gap: 10px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.die {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: var(--bg2);
		border: 2px solid var(--border);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		padding: 6px;
		cursor: pointer;
	}
	.die.die-empty {
		border-style: dashed;
		background: transparent;
	}
	.die:hover {
		border-color: var(--accent);
	}
	.pip {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--bright);
		align-self: center;
		justify-self: center;
	}
	.pip-tl {
		grid-row: 1;
		grid-column: 1;
	}
	.pip-tr {
		grid-row: 1;
		grid-column: 3;
	}
	.pip-ml {
		grid-row: 2;
		grid-column: 1;
	}
	.pip-mc {
		grid-row: 2;
		grid-column: 2;
	}
	.pip-mr {
		grid-row: 2;
		grid-column: 3;
	}
	.pip-bl {
		grid-row: 3;
		grid-column: 1;
	}
	.pip-br {
		grid-row: 3;
		grid-column: 3;
	}
	.dice-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.option-card {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 8px 12px;
		margin: 4px 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg2);
		font-size: 13px;
	}
	.option-card:hover {
		border-color: var(--accent2);
	}
	.option-card.best-option {
		border-color: var(--accent);
		background: rgba(57, 211, 83, 0.06);
	}
	.best-badge {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
	}
	.hint {
		color: var(--muted);
		font-size: 13px;
	}
	.bust-message {
		font-size: 14px;
		color: var(--accent3);
		margin-bottom: 8px;
	}
	.score-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 3px 0;
		font-size: 13px;
		gap: 8px;
	}
	.opponent-controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.score-row input {
		width: 72px;
		font-size: 13px;
		padding: 2px 6px;
	}
	.die-clear {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg2);
		color: var(--muted);
		font-size: 11px;
		line-height: 1;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.die-clear:hover {
		border-color: var(--accent3);
		color: var(--accent3);
	}
	.history-list {
		font-size: 13px;
		color: var(--muted);
		padding-left: 18px;
		margin: 0;
	}
</style>
```

- [ ] **Step 2: Format and type-check**

```bash
pnpm exec prettier --write src/routes/utils/tenk/+page.svelte
pnpm check
```

Expected: `pnpm check` reports 0 errors.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:5173/utils/tenk` in a browser. Verify:
- Basic ruleset: click 6 dice to some values with a scoring combo (e.g. two 1s + junk), confirm ranked options appear, click one, confirm a stop/reroll choice appears, click stop, confirm total score updates and turn history logs an entry.
- House rule: switch ruleset, roll 6 dice with a partial score, confirm the single forced stop/reroll card appears, click reroll, confirm the dice row shrinks to the remaining count and a second roll combines correctly (try the two documented worked examples: 100→1000 and 100→200→300 from `tenk-solver/CLAUDE.md`).
- Add/remove/edit an opponent, confirm it doesn't affect the recommendation.
- Trigger a bust in both rulesets, confirm turn score resets to 0 and total score is unaffected.

Stop the dev server (Ctrl-C) once satisfied.

- [ ] **Step 4: Commit**

```bash
git add src/routes/utils/tenk/+page.svelte
git commit -m "feat(tenk): add /utils/tenk page

Dice-and-cards UI wired to the recommend.ts API: ruleset toggle, ranked
bank options (basic) or forced stop/reroll (house rule), running total
toward 10,000, on-the-board status, opponents panel, turn history."
```

---

### Task 9: Component tests for `+page.svelte`

**Files:**
- Create: `src/routes/utils/tenk/page.test.ts`

**Interfaces:**
- Consumes: the page component from Task 8 via `@testing-library/svelte`.

- [ ] **Step 1: Write the tests**

Create `src/routes/utils/tenk/page.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/utils/tenk page', () => {
	it('renders both ruleset toggle buttons, basic selected by default', () => {
		render(Page);
		const basicBtn = screen.getByRole('button', { name: 'Basic' });
		const houseruleBtn = screen.getByRole('button', { name: 'House rule' });
		expect(basicBtn.className).toContain('btn-active');
		expect(houseruleBtn.className).not.toContain('btn-active');
	});

	it('switching ruleset resets the in-progress turn and highlights the new button', async () => {
		render(Page);
		const houseruleBtn = screen.getByRole('button', { name: 'House rule' });
		await fireEvent.click(houseruleBtn);
		expect(houseruleBtn.className).toContain('btn-active');
		expect(screen.getByText('Enter all 6 dice to see a recommendation.')).toBeInTheDocument();
	});

	it('shows a hint until all dice are entered', () => {
		render(Page);
		expect(screen.getByText('Enter all 6 dice to see a recommendation.')).toBeInTheDocument();
	});

	it('clicking a die cycles its value', async () => {
		render(Page);
		const firstDie = screen.getByLabelText('Die 1, empty');
		await fireEvent.click(firstDie);
		expect(screen.getByLabelText('Die 1, value 1')).toBeInTheDocument();
	});

	it('adds and removes an opponent', async () => {
		render(Page);
		const addBtn = screen.getByRole('button', { name: 'Add opponent' });
		await fireEvent.click(addBtn);
		expect(screen.getByText('Player 2')).toBeInTheDocument();
		const removeBtn = screen.getByRole('button', { name: 'Remove Player 2' });
		await fireEvent.click(removeBtn);
		expect(screen.queryByText('Player 2')).not.toBeInTheDocument();
	});

	it('rolling all remaining dice produces a recommendation', async () => {
		render(Page);
		const rollBtn = screen.getByRole('button', { name: 'Roll remaining' });
		await fireEvent.click(rollBtn);
		expect(screen.queryByText('Enter all 6 dice to see a recommendation.')).not.toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test page.test`
Expected: PASS. (This task adds tests for an already-implemented component from Task 8, so there's no red step — but run it once before writing to confirm it would have failed against an empty/missing file, by temporarily checking `git stash` is not needed: since Task 8 is already committed, just run the tests directly and confirm green.)

- [ ] **Step 3: Format**

```bash
pnpm exec prettier --write src/routes/utils/tenk/page.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/utils/tenk/page.test.ts
git commit -m "test(tenk): add component tests for /utils/tenk page

Covers ruleset toggle, die click-to-cycle, opponents add/remove, and
roll-remaining triggering a recommendation."
```

---

### Task 10: Link from the utils index, update CLAUDE.md

**Files:**
- Modify: `src/routes/utils/+page.svelte`
- Modify: `CLAUDE.md`

**Interfaces:**
- None (documentation/navigation only).

- [ ] **Step 1: Add a card to the utils index**

In `src/routes/utils/+page.svelte`, add this card right after the existing yatzy card (after the `</a>` that closes the `/utils/yatzy` card, before `</div>` that closes `.utils-grid`):

```svelte
			<a href="/utils/tenk" class="card util-card">
				<div class="util-name">tenk</div>
				<div class="util-desc">Optimal-play "10,000" dice game assistant</div>
			</a>
```

- [ ] **Step 2: Update `CLAUDE.md`**

In the "Commands" section, add after the `pnpm check:watch` line:

```
pnpm test          # Run the test suite once
pnpm test:watch    # Run tests in watch mode
```

Replace the line `No test suite exists in this project.` with:

```
Test suite: Vitest, covering src/lib/tenk/ (pure logic — solver golden
values, state transitions, recommendations) and one component test file
for /utils/tenk. No tests exist yet for other routes/components.
```

In the "Routing & pages" section, add after the `src/routes/utils/yatzy/` bullet:

```
- `src/routes/utils/tenk/` — optimal-play "10,000" (Terning 10 000 / Cows)
  solver. Unlike yatzy, this is a native TypeScript port (see
  `src/lib/tenk/`) solved live in-browser — no WASM/precompute, since the
  state space is small enough to solve in milliseconds. Ported from
  `tenk-solver` (sibling repo); if its Go rules ever change, this needs
  manual re-porting, same as yatzy's vendoring note above.
```

- [ ] **Step 3: Format**

```bash
pnpm exec prettier --write src/routes/utils/+page.svelte
```

- [ ] **Step 4: Verify**

```bash
pnpm check
pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/routes/utils/+page.svelte CLAUDE.md
git commit -m "docs: link /utils/tenk from the utils index, update CLAUDE.md

Documents the new test suite and the tenk route's TypeScript-port
architecture (as opposed to yatzy's WASM approach)."
```

---

### Task 11: Point `tenk-solver`'s README at the website util

**Files:**
- Modify: `~/projects/privat/claude/tenk-solver/README.md` (separate repo — `cd` there for this task)

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Add a pointer**

In `~/projects/privat/claude/tenk-solver/README.md`, add a new section after "## Usage" (before "## Modeling notes"):

```markdown
## Web util

An interactive version of this solver — enter the dice you rolled,
get bank/reroll advice, track progress toward 10,000 and opponents'
scores — lives at `/utils/tenk` on [ellewsen.no](https://ellewsen.no),
built from a native TypeScript port of these Go solvers (source:
`tellewsen.github.io`'s `src/lib/tenk/`). See that repo's
`docs/superpowers/specs/2026-07-22-tenk-solver-util-design.md` for the
port's design.
```

- [ ] **Step 2: Commit (in the `tenk-solver` repo)**

```bash
cd ~/projects/privat/claude/tenk-solver
git add README.md
git commit -m "docs: point to the /utils/tenk web port of this solver"
```

---

## Self-Review

**Spec coverage:** Both rulesets ported and toggled (Task 8) ✓. Full game simulation — running total, on-the-board, bust/hot-dice, turn history (Task 5, 8) ✓. Opponent tracking, display-only (Task 6, 8) ✓. Native TS, solved live, no WASM (Tasks 2–4) ✓. Memoization keyed by threshold, not global mutable state (Tasks 3, 4) ✓. Golden-value verification against Go output, now as permanent tests per the user's follow-up request (Tasks 3, 4) ✓. Vitest test suite introduced (Task 1) with unit tests (Tasks 2–7) and component tests (Task 9) ✓. Utils index link and CLAUDE.md updates (Task 10) ✓. `tenk-solver` README pointer (Task 11) ✓. Out-of-scope items from the spec (race-aware recommendations, multiplayer turn-taking, Go code changes) are correctly not present in any task.

**Placeholder scan:** No TBD/TODO; every step has complete, runnable code.

**Type consistency:** `GameState`, `Ruleset`, `CyclePhase` (Task 5) match their usage in `match.ts` (Task 6), `recommend.ts` (Task 7), and `+page.svelte` (Task 8). `Candidate` (Task 2) matches its use in `solverBasic.ts` (Task 3) and `recommend.ts`'s `BasicBankOption.banked` field. `Decomposition` (Task 4) matches its destructuring (`points`, `used`, `banked`) in `recommend.ts` (Task 7). The `{ bankVal, rerollVal }` shape returned by `decisionComponents`/`decisionComponentsA/B/C` is used consistently in `recommend.ts`'s `recommend: bankVal >= rerollVal ? 'stop' : 'reroll'` checks throughout.
