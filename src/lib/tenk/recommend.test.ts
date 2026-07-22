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
			expect(advice.options[i - 1].expectedValue).toBeGreaterThanOrEqual(
				advice.options[i].expectedValue
			);
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
