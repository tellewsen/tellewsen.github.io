// state.ts — pure GameState model and transitions for a single player's
// progress through a game of 10,000. No solving logic here — see
// recommend.ts, which is the only module that calls into solverBasic /
// solverHouserule and decides what to display.
export type Ruleset = 'basic' | 'houserule';
export type CyclePhase = 'fresh' | 'combining' | 'independent';

export interface GameState {
	ruleset: Ruleset;
	onBoard: boolean;
	totalScore: number;
	turnScore: number;
	diceRemaining: number;
	cyclePhase: CyclePhase;
	keptForCombining: number[] | null;
	turnHistory: number[];
}

export function initialGameState(ruleset: Ruleset): GameState {
	return {
		ruleset,
		onBoard: false,
		totalScore: 0,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null,
		turnHistory: []
	};
}

export function applyBust(state: GameState): GameState {
	return {
		...state,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null
	};
}

export function stopTurn(state: GameState): GameState {
	return {
		...state,
		totalScore: state.totalScore + state.turnScore,
		onBoard: state.onBoard || state.turnScore >= 1000,
		turnScore: 0,
		diceRemaining: 6,
		cyclePhase: 'fresh',
		keptForCombining: null,
		turnHistory: [...state.turnHistory, state.turnScore]
	};
}

export function applyBank(state: GameState, points: number, diceUsed: number): GameState {
	const remaining = state.diceRemaining - diceUsed;
	const hotDice = remaining === 0;
	return {
		...state,
		turnScore: state.turnScore + points,
		diceRemaining: hotDice ? 6 : remaining,
		cyclePhase: hotDice ? 'fresh' : state.cyclePhase,
		keptForCombining: hotDice ? null : state.keptForCombining
	};
}

export function enterCombiningWindow(
	state: GameState,
	keptCounts: number[],
	diceUsed: number
): GameState {
	return {
		...state,
		diceRemaining: state.diceRemaining - diceUsed,
		cyclePhase: 'combining',
		keptForCombining: keptCounts
	};
}

export function resolveCombiningRoll(state: GameState, pointsC: number, usedC: number): GameState {
	const remaining = 6 - usedC;
	const hotDice = remaining === 0;
	return {
		...state,
		turnScore: state.turnScore + pointsC,
		diceRemaining: hotDice ? 6 : remaining,
		cyclePhase: hotDice ? 'fresh' : 'independent',
		keptForCombining: null
	};
}

export function stopMidCombining(state: GameState, provisionalPoints: number): GameState {
	return stopTurn({ ...state, turnScore: state.turnScore + provisionalPoints });
}
