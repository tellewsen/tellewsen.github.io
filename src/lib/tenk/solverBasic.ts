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
