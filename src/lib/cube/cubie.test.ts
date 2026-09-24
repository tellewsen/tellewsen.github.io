import { describe, it, expect } from 'vitest';
import {
	solvedCube,
	applyMove,
	applyMoves,
	parseMoves,
	formatMoves,
	inverseMoves,
	isSolved,
	randomCube,
	permutationParity,
	MOVE_NAMES
} from './cubie';
import { toFacelets } from './facelet';

// Independent geometric model: every sticker is a (position, normal) pair in
// 3D, and a face turn is a literal 90° rotation of the stickers in that
// layer. Used as an oracle for the hand-written cubie move tables.
type V = [number, number, number];
const FACE_FRAMES: { n: V; r: V; d: V }[] = [
	{ n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1] }, // U
	{ n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0] }, // R
	{ n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0] }, // F
	{ n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1] }, // D
	{ n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0] }, // L
	{ n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0] } // B
];
const add = (a: V, b: V, s = 1): V => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
const stickers = FACE_FRAMES.flatMap(({ n, r, d }) =>
	Array.from({ length: 9 }, (_, k) => {
		const pos = add(add(n, r, (k % 3) - 1), d, Math.floor(k / 3) - 1);
		return { pos, n };
	})
);
const key = (s: { pos: V; n: V }) => [...s.pos, ...s.n].join(',');
const indexOf = new Map(stickers.map((s, i) => [key(s), i]));

// Clockwise as seen from outside = -90° about the outward axis.
const rotCW = (a: V, v: V): V => add(cross(v, a), a, dot(a, v));

function geometricTurn(faceIdx: number, facelets: number[]): number[] {
	const axis = FACE_FRAMES[faceIdx].n;
	const out = [...facelets];
	stickers.forEach((s, i) => {
		if (dot(s.pos, axis) !== 1) return;
		const j = indexOf.get(key({ pos: rotCW(axis, s.pos), n: rotCW(axis, s.n) }))!;
		out[j] = facelets[i];
	});
	return out;
}

function seeded(seed: number) {
	return () => {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		return seed / 0x80000000;
	};
}

describe('cubie moves', () => {
	it('match a geometric sticker rotation for every face, from random states', () => {
		const rand = seeded(1);
		for (let trial = 0; trial < 20; trial++) {
			const c = randomCube(rand);
			for (let f = 0; f < 6; f++) {
				expect(toFacelets(applyMove(c, f * 3))).toEqual(geometricTurn(f, toFacelets(c)));
			}
		}
	});

	it('four quarter turns are the identity, including centers', () => {
		for (let f = 0; f < 6; f++) {
			const c = applyMoves(solvedCube(), [f * 3, f * 3, f * 3, f * 3]);
			expect(isSolved(c, true)).toBe(true);
		}
	});

	it('sexy move (R U R\' U\') has order 6', () => {
		const alg = parseMoves("R U R' U'");
		let c = solvedCube();
		for (let i = 1; i <= 6; i++) {
			c = applyMoves(c, alg);
			expect(isSolved(c)).toBe(i === 6);
		}
	});

	it('a quarter turn is an odd permutation of corners and turns its center', () => {
		const c = applyMove(solvedCube(), parseMoves('R')[0]);
		expect(permutationParity(c.cp)).toBe(1);
		expect(c.ct).toEqual([0, 1, 0, 0, 0, 0]);
	});

	it('inverseMoves undoes a sequence', () => {
		const moves = parseMoves("R U2 F' L D B2 R'");
		expect(isSolved(applyMoves(applyMoves(solvedCube(), moves), inverseMoves(moves)), true)).toBe(
			true
		);
	});

	it('parses and formats move notation', () => {
		expect(formatMoves(parseMoves("  R  U2 F' "))).toBe("R U2 F'");
		expect(MOVE_NAMES).toHaveLength(18);
		expect(() => parseMoves('X')).toThrow('Unknown move "X"');
	});
});

describe('randomCube', () => {
	it('always produces a reachable state', () => {
		const rand = seeded(7);
		for (let i = 0; i < 100; i++) {
			const c = randomCube(rand);
			expect(c.co.reduce((s, v) => s + v, 0) % 3).toBe(0);
			expect(c.eo.reduce((s, v) => s + v, 0) % 2).toBe(0);
			expect(permutationParity(c.cp)).toBe(permutationParity(c.ep));
		}
	});
});
