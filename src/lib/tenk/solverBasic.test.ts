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
