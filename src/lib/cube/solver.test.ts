import { describe, it, expect, beforeAll } from 'vitest';
import { solvedCube, applyMoves, parseMoves, randomCube, isSolved, formatMoves } from './cubie';
import {
	getTwist,
	setTwist,
	getFlip,
	setFlip,
	getSlice,
	setSlice,
	getCornerPerm,
	setCornerPerm,
	N_TWIST,
	N_FLIP,
	N_SLICE,
	SOLVED_SLICE
} from './coord';
import { initTables, solve } from './solver';

describe('coordinates', () => {
	it('set/get round-trip over their whole range', () => {
		const c = solvedCube();
		for (let v = 0; v < N_TWIST; v++) {
			setTwist(c, v);
			expect(getTwist(c)).toBe(v);
		}
		for (let v = 0; v < N_FLIP; v++) {
			setFlip(c, v);
			expect(getFlip(c)).toBe(v);
		}
		for (let v = 0; v < N_SLICE; v++) {
			setSlice(c, v);
			expect(getSlice(c)).toBe(v);
		}
		for (const v of [0, 1, 777, 40319]) {
			setCornerPerm(c, v);
			expect(getCornerPerm(c)).toBe(v);
		}
	});

	it('solved cube is at the phase 1 goal', () => {
		const c = solvedCube();
		expect([getTwist(c), getFlip(c), getSlice(c)]).toEqual([0, 0, SOLVED_SLICE]);
	});
});

describe('solve', () => {
	beforeAll(() => initTables(), 30_000);

	it('returns nothing for a solved cube', () => {
		expect(solve(solvedCube())).toEqual([]);
	});

	it('undoes short scrambles optimally', () => {
		for (const s of ['R', "U'", 'F2', 'R U', "R U R' U'", 'D L2 B']) {
			const moves = parseMoves(s);
			const solution = solve(applyMoves(solvedCube(), moves));
			expect(solution.length, `${s} -> ${formatMoves(solution)}`).toBe(moves.length);
			expect(isSolved(applyMoves(applyMoves(solvedCube(), moves), solution))).toBe(true);
		}
	});

	it('solves the superflip', () => {
		const superflip = parseMoves("U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2");
		const c = applyMoves(solvedCube(), superflip);
		expect(c.cp).toEqual(solvedCube().cp);
		expect(c.eo.every((o) => o === 1)).toBe(true);
		const solution = solve(c, { timeoutMs: 3000 });
		expect(isSolved(applyMoves(c, solution))).toBe(true);
		expect(solution.length).toBeLessThanOrEqual(24);
	});

	it('solves random cubes in few moves', () => {
		for (let i = 0; i < 20; i++) {
			const c = randomCube();
			const solution = solve(c, { timeoutMs: 500 });
			expect(isSolved(applyMoves(c, solution))).toBe(true);
			expect(solution.length).toBeLessThanOrEqual(22);
		}
	}, 30_000);
});
