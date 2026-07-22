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
