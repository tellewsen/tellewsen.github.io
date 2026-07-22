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
