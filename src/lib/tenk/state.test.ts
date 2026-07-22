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
		const before = {
			...initialGameState('houserule'),
			diceRemaining: 3,
			cyclePhase: 'independent' as const
		};
		const after = applyBank(before, 300, 3);
		expect(after.diceRemaining).toBe(6);
		expect(after.cyclePhase).toBe('fresh');
	});

	it('preserves cyclePhase when not hot dice', () => {
		const before = {
			...initialGameState('houserule'),
			diceRemaining: 4,
			cyclePhase: 'independent' as const
		};
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
