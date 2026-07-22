import { describe, it, expect } from 'vitest';
import {
	initialMatchState,
	addOpponent,
	removeOpponent,
	updateOpponentScore,
	renameOpponent
} from './match';

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
