// recommend.ts — the only module that combines GameState with the
// solvers to produce advice for an actual dice roll: what happened
// (bust / forced bank / ranked bank options) and ready-to-apply next
// states for "stop" and "reroll" (or "acknowledge" for a bust), so the
// UI never has to know which state.ts transition applies to which
// situation.
import type { GameState } from './state';
import {
	applyBank,
	applyBust,
	enterCombiningWindow,
	resolveCombiningRoll,
	stopMidCombining,
	stopTurn
} from './state';
import { countsFromDice, bestCandidatesForCounts } from './scoring';
import { decisionComponents as basicDecisionComponents } from './solverBasic';
import {
	decomposeMandatory,
	decisionComponentsA,
	decisionComponentsB,
	decisionComponentsC
} from './solverHouserule';

const ENTRY_THRESHOLD = 1000;

function thresholdFor(state: GameState): number {
	return state.onBoard ? 0 : ENTRY_THRESHOLD;
}

function applyStop(bankedState: GameState, threshold: number): GameState {
	if (bankedState.turnScore >= threshold) return stopTurn(bankedState);
	return applyBust(bankedState);
}

export interface BasicBankOption {
	banked: number[];
	points: number;
	diceUsed: number;
	stopEV: number;
	rerollEV: number;
	recommend: 'stop' | 'reroll';
	expectedValue: number;
	onStop: GameState;
	onReroll: GameState;
}

export interface HouseruleForced {
	kind: 'houseruleForced';
	points: number;
	diceUsed: number;
	stopEV: number;
	rerollEV: number;
	recommend: 'stop' | 'reroll';
	onStop: GameState;
	onReroll: GameState;
}

export type RollAdvice =
	| { kind: 'bust'; onAcknowledge: GameState }
	| { kind: 'basicOptions'; options: BasicBankOption[] }
	| HouseruleForced;

function forced(
	points: number,
	diceUsed: number,
	bankedState: GameState,
	stopEV: number,
	rerollEV: number,
	threshold: number
): HouseruleForced {
	return {
		kind: 'houseruleForced',
		points,
		diceUsed,
		stopEV,
		rerollEV,
		recommend: stopEV >= rerollEV ? 'stop' : 'reroll',
		onStop: applyStop(bankedState, threshold),
		onReroll: bankedState
	};
}

export function getRollAdvice(state: GameState, roll: number[]): RollAdvice {
	const threshold = thresholdFor(state);
	const counts = countsFromDice(roll);

	if (state.ruleset === 'basic') {
		const candidates = bestCandidatesForCounts(counts);
		if (candidates.size === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };
		const aUnits = state.turnScore / 50;
		const options: BasicBankOption[] = [];
		for (const [diceUsed, candidate] of candidates) {
			const remaining = state.diceRemaining - diceUsed;
			const nPrime = remaining === 0 ? 6 : remaining;
			const { bankVal, rerollVal } = basicDecisionComponents(
				nPrime,
				aUnits + candidate.points / 50,
				threshold
			);
			const bankedState = applyBank(state, candidate.points, diceUsed);
			options.push({
				banked: candidate.banked,
				points: candidate.points,
				diceUsed,
				stopEV: bankVal,
				rerollEV: rerollVal,
				recommend: bankVal >= rerollVal ? 'stop' : 'reroll',
				expectedValue: Math.max(bankVal, rerollVal),
				onStop: applyStop(bankedState, threshold),
				onReroll: bankedState
			});
		}
		options.sort((a, b) => b.expectedValue - a.expectedValue);
		return { kind: 'basicOptions', options };
	}

	// house rule
	const aUnits = state.turnScore / 50;

	if (state.cyclePhase === 'fresh') {
		const d = decomposeMandatory(counts);
		if (d.used === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };

		if (d.used === 6) {
			const bankedState = applyBank(state, d.points, 6);
			const { bankVal, rerollVal } = decisionComponentsA(aUnits + d.points / 50, threshold);
			return forced(d.points, 6, bankedState, bankVal, rerollVal, threshold);
		}

		const n1 = 6 - d.used;
		const { bankVal, rerollVal } = decisionComponentsB(n1, d.banked, aUnits, threshold);
		return {
			kind: 'houseruleForced',
			points: d.points,
			diceUsed: d.used,
			stopEV: bankVal,
			rerollEV: rerollVal,
			recommend: bankVal >= rerollVal ? 'stop' : 'reroll',
			onStop:
				state.turnScore + d.points >= threshold
					? stopMidCombining(state, d.points)
					: applyBust(state),
			onReroll: enterCombiningWindow(state, d.banked, d.used)
		};
	}

	if (state.cyclePhase === 'combining') {
		const kept = state.keptForCombining!;
		const used1 = decomposeMandatory(kept).used;
		const combined = kept.map((c, i) => c + counts[i]);
		const d = decomposeMandatory(combined);
		if (d.used === used1) return { kind: 'bust', onAcknowledge: applyBust(state) };

		const bankedState = resolveCombiningRoll(state, d.points, d.used);
		const newAUnits = aUnits + d.points / 50;
		const { bankVal, rerollVal } =
			d.used === 6
				? decisionComponentsA(newAUnits, threshold)
				: decisionComponentsC(6 - d.used, newAUnits, threshold);
		return forced(d.points, d.used, bankedState, bankVal, rerollVal, threshold);
	}

	// independent phase (throw 3+)
	const d = decomposeMandatory(counts);
	if (d.used === 0) return { kind: 'bust', onAcknowledge: applyBust(state) };
	const bankedState = applyBank(state, d.points, d.used);
	const newAUnits = aUnits + d.points / 50;
	const { bankVal, rerollVal } =
		d.used === state.diceRemaining
			? decisionComponentsA(newAUnits, threshold)
			: decisionComponentsC(state.diceRemaining - d.used, newAUnits, threshold);
	return forced(d.points, d.used, bankedState, bankVal, rerollVal, threshold);
}
