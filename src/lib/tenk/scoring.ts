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
