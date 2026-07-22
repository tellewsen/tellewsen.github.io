import { describe, it, expect } from 'vitest';
import {
	kindScore,
	countsFromDice,
	generateRollOutcomes,
	bestCandidatesForCounts
} from './scoring';

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
