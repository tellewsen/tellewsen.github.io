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

function componentsB(
	n1: number,
	kept: number[],
	aUnits: number,
	threshold: number
): ValueComponents {
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

export function decisionComponentsA(
	aUnits: number,
	threshold: number
): { bankVal: number; rerollVal: number } {
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
