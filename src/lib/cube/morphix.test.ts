import { describe, it, expect, beforeAll } from 'vitest';
import {
	type CubieCube,
	solvedCube,
	applyMove,
	applyMoves,
	randomCube,
	permutationParity,
	cloneCube,
	parseMoves,
	inverseMoves
} from './cubie';
import {
	type Vec,
	type Mat,
	N_SLOTS,
	EDGE_SLOT,
	CENTER_SLOT,
	SLOT_POSITIONS,
	slotKind,
	pieceAt,
	faceTurn,
	matMul,
	dot,
	cross,
	add,
	norm
} from './geometry';
import {
	PIECE_SHAPES,
	EDGE_GROUPS,
	pieceKind,
	pieceColors,
	pieceName,
	slotLook,
	looksSolved,
	looksSame,
	checkMorphix,
	slotOptions,
	setCorner,
	setEdgeColor,
	turnCenter,
	flipEdge,
	edgeGroup,
	type Polygon
} from './morphix';
import { initTables, solve } from './solver';

const NAMES = ['red', 'yellow', 'green', 'blue'];

function seeded(seed: number) {
	return () => {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		return seed / 0x80000000;
	};
}

const det = (m: Mat) => dot(m[0], cross(m[1], m[2]));
const close = (a: Mat, b: Mat) =>
	a.every((row, r) => row.every((v, c) => Math.abs(v - b[r][c]) < 1e-9));

function area(p: Polygon): number {
	let s: Vec = [0, 0, 0];
	for (let i = 1; i + 1 < p.vertices.length; i++) {
		s = add(
			s,
			cross(add(p.vertices[i], p.vertices[0], -1), add(p.vertices[i + 1], p.vertices[0], -1))
		);
	}
	return norm(s) / 2;
}

const volume = (shape: Polygon[]) =>
	shape.reduce((v, p) => v + (area(p) * dot(p.normal, p.vertices[0])) / 3, 0);

describe('mechanism geometry', () => {
	it('pieces are rotated rigidly, and turn with their layer', () => {
		const rand = seeded(3);
		for (let trial = 0; trial < 10; trial++) {
			const c = randomCube(rand, true);
			for (let m = 0; m < 18; m += 1) {
				const after = applyMove(c, m);
				const turn = faceTurn(Math.floor(m / 3), (m % 3) + 1);
				const axis = SLOT_POSITIONS[CENTER_SLOT + Math.floor(m / 3)];
				for (let s = 0; s < N_SLOTS; s++) {
					const before = pieceAt(c, s);
					expect(det(before.rotation)).toBeCloseTo(1);
					// Find where this piece is after the move.
					const t = Array.from({ length: N_SLOTS }, (_, i) => i).find(
						(i) => pieceAt(after, i).home === before.home
					)!;
					const expected =
						dot(SLOT_POSITIONS[s], axis) === 1 ? matMul(turn, before.rotation) : before.rotation;
					expect(close(pieceAt(after, t).rotation, expected)).toBe(true);
				}
			}
		}
	});
});

describe('Mastermorphix shapes', () => {
	it('has 4 tips, 4 triangles, 12 one-colour edges and 6 two-colour centers', () => {
		const kinds = Array.from({ length: N_SLOTS }, (_, s) => pieceKind(s));
		expect(kinds.filter((k) => k === 'tip')).toHaveLength(4);
		expect(kinds.filter((k) => k === 'triangle')).toHaveLength(4);
		for (let s = 0; s < N_SLOTS; s++) {
			const n = pieceColors(s).length;
			expect(n).toBe({ tip: 3, triangle: 1, edge: 1, center: 2 }[kinds[s]]);
		}
		expect(EDGE_GROUPS.map((g) => g.length)).toEqual([3, 3, 3, 3]);
		expect(pieceName(0, NAMES)).toBe('yellow-green-blue tip'); // URF
		expect(pieceName(CENTER_SLOT, NAMES)).toBe('yellow-blue edge'); // U
	});

	it('pieces fill the tetrahedron exactly (plus the hidden core)', () => {
		const K = 2.25;
		const total = PIECE_SHAPES.reduce((v, shape) => v + volume(shape), 0) + 1;
		expect(total).toBeCloseTo((8 * K ** 3) / 3, 6);
		// Each face is covered by 10 patches: 3 tip corners, 3 center halves,
		// 3 edges and 1 triangle, adding up to the whole face.
		const faceArea = (Math.sqrt(3) / 4) * (2 * Math.SQRT2 * K) ** 2;
		for (let color = 0; color < 4; color++) {
			const patches = PIECE_SHAPES.flat().filter((p) => p.color === color);
			expect(patches).toHaveLength(10);
			expect(patches.reduce((s, p) => s + area(p), 0)).toBeCloseTo(faceArea, 6);
		}
	});

	it('shows center turns, tip twists and edge flips, but not triangle twists', () => {
		const looks = (edit: (c: CubieCube, v: number) => void, slot: number, n: number) =>
			new Set(
				Array.from({ length: n }, (_, v) => {
					const c = solvedCube();
					edit(c, v);
					return slotLook(c, slot);
				})
			).size;
		for (let f = 0; f < 6; f++) expect(looks((c, v) => (c.ct[f] = v), CENTER_SLOT + f, 4)).toBe(4);
		for (let i = 0; i < 8; i++) {
			const expected = pieceKind(i) === 'tip' ? 3 : 1;
			expect(looks((c, v) => (c.co[i] = v), i, 3)).toBe(expected);
		}
		for (let i = 0; i < 12; i++) expect(looks((c, v) => (c.eo[i] = v), i + EDGE_SLOT, 2)).toBe(2);
	});

	it('offers every distinct look of a slot, changing nothing else', () => {
		const cube = randomCube(Math.random, true);
		for (let s = 0; s < N_SLOTS; s++) {
			const options = slotOptions(cube, s);
			// Corner spot: 4 tips x 3 twists + 4 face centers; side piece: 4
			// colours x 2 flips; edge: 4 turns.
			expect(options).toHaveLength({ corner: 16, edge: 8, center: 4 }[slotKind(s)]);
			const looks = options.map((o) => slotLook(o, s));
			expect(new Set(looks).size).toBe(options.length);
			expect(looks).toContain(slotLook(cube, s));
			for (const o of options) {
				for (let t = 0; t < N_SLOTS; t++) {
					if (t !== s) expect(slotLook(o, t)).toBe(slotLook(cube, t));
				}
			}
		}
	});

	it('edges of the same colour look identical in any slot', () => {
		for (let slot = 0; slot < 12; slot++) {
			for (const group of EDGE_GROUPS) {
				const lookSets = group.map((piece) => {
					const c = solvedCube();
					c.ep[slot] = piece;
					return [0, 1]
						.map((eo) => ((c.eo[slot] = eo), slotLook(c, slot + EDGE_SLOT)))
						.sort()
						.join('/');
				});
				expect(new Set(lookSets).size).toBe(1);
			}
		}
	});

	it('looks solved only when solved (up to invisible differences)', () => {
		expect(looksSolved(solvedCube())).toBe(true);
		for (let m = 0; m < 18; m++) expect(looksSolved(applyMove(solvedCube(), m))).toBe(false);
		const alg = parseMoves("R U2 F' L D");
		expect(looksSolved(applyMoves(solvedCube(), [...alg, ...inverseMoves(alg)]))).toBe(true);
		// A twisted triangle, alone, is invisible.
		const c = solvedCube();
		const triangle = [0, 1, 2, 3, 4, 5, 6, 7].find((i) => pieceKind(i) === 'triangle')!;
		c.co[triangle] = 1;
		expect(looksSolved(c)).toBe(true);
	});
});

/** What someone entering `c` piece by piece would produce. */
function asEntered(c: CubieCube): CubieCube {
	let e = cloneCube(c);
	for (let i = 0; i < 12; i++) {
		const target = slotLook(c, i + EDGE_SLOT);
		e = setEdgeColor(e, i + EDGE_SLOT, edgeGroup(c.ep[i]));
		if (slotLook(e, i + EDGE_SLOT) !== target) e = flipEdge(e, i + EDGE_SLOT);
	}
	for (let i = 0; i < 8; i++) if (pieceKind(c.cp[i]) === 'triangle') e.co[i] = 0;
	return e;
}

function isReachable(c: CubieCube): boolean {
	return (
		c.co.reduce((s, v) => s + v, 0) % 3 === 0 &&
		c.eo.reduce((s, v) => s + v, 0) % 2 === 0 &&
		permutationParity(c.cp) === permutationParity(c.ep) &&
		(c.ct.reduce((s, v) => s + v, 0) + permutationParity(c.cp)) % 2 === 0 &&
		new Set(c.ep).size === 12 &&
		new Set(c.cp).size === 8
	);
}

describe('checkMorphix', () => {
	it('turns an entered position into reachable states that look the same', () => {
		const rand = seeded(11);
		for (let trial = 0; trial < 30; trial++) {
			const real = randomCube(rand, true);
			const entered = asEntered(real);
			expect(looksSame(entered, real)).toBe(true);
			const result = checkMorphix(entered, NAMES, 4, rand);
			expect(result.ok).toBe(true);
			if (!result.ok) continue;
			expect(result.candidates).toHaveLength(4);
			for (const cand of result.candidates) {
				expect(isReachable(cand)).toBe(true);
				expect(looksSame(cand, real)).toBe(true);
			}
		}
	});

	it('reports duplicated and missing pieces', () => {
		const c = setCorner(solvedCube(), 1, 0); // UFL slot gets a second URF tip
		const r = checkMorphix(c, NAMES);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.errors.map((e) => e.message)).toEqual([
				'The yellow-green-blue tip appears 2 times.',
				`Missing: the ${pieceName(1, NAMES)}.`
			]);
			expect(r.errors[0].slots).toEqual([0, 1]);
		}
	});

	it('reports wrong edge colour counts', () => {
		const other = (edgeGroup(0) + 1) % 4;
		const r = checkMorphix(setEdgeColor(solvedCube(), EDGE_SLOT, other), NAMES);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			const messages = r.errors.map((e) => e.message);
			expect(messages).toContain(`There are 2 ${NAMES[edgeGroup(0)]} side pieces, expected 3.`);
			expect(messages).toContain(`There are 4 ${NAMES[other]} side pieces, expected 3.`);
		}
	});

	it('reports a center a quarter turn off, and a flipped edge', () => {
		const r1 = checkMorphix(turnCenter(solvedCube(), CENTER_SLOT), NAMES);
		expect(!r1.ok && r1.errors[0].message).toMatch(/quarter turn off/);
		const r2 = checkMorphix(flipEdge(solvedCube(), EDGE_SLOT), NAMES);
		expect(!r2.ok && r2.errors[0].message).toMatch(/side piece is flipped/);
	});
});

describe('solving a Mastermorphix', () => {
	beforeAll(() => initTables(), 30_000);

	it('solutions make the puzzle look solved', () => {
		const rand = seeded(5);
		for (let trial = 0; trial < 3; trial++) {
			const real = randomCube(rand, true);
			const r = checkMorphix(asEntered(real), NAMES, 1, rand);
			if (!r.ok) throw new Error(r.errors[0].message);
			const moves = solve(r.candidates[0], { centers: true, timeoutMs: 300 });
			expect(looksSolved(applyMoves(real, moves))).toBe(true);
		}
	}, 60_000);

	it('fixes a lone half-turned center', () => {
		const c = solvedCube();
		c.ct[0] = 2;
		const r = checkMorphix(c, NAMES, 1);
		if (!r.ok) throw new Error(r.errors[0].message);
		expect(looksSolved(c)).toBe(false);
		const moves = solve(r.candidates[0], { centers: true, timeoutMs: 300 });
		expect(looksSolved(applyMoves(c, moves))).toBe(true);
	}, 60_000);
});
