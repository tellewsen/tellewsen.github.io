// Cubie-level model of the 3x3x3 mechanism: which piece sits in which slot,
// and how it is oriented. This is independent of stickers/colours, so the
// same model serves any shape mod of the 3x3 (e.g. the Mastermorphix) —
// only the facelet/input layer differs.
//
// Conventions follow Kociemba: a cube is described by "piece in slot i is
// cp[i]" (replaced-by representation), and a move is itself a cube that is
// multiplied on the right.

// Faces, in the order used everywhere (move names, facelet blocks, colours).
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = 0 | 1 | 2 | 3 | 4 | 5;
export const U = 0,
	R = 1,
	F = 2,
	D = 3,
	L = 4,
	B = 5;

// Corner slots: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
export const CORNER_NAMES = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
// Edge slots: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
export const EDGE_NAMES = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

export interface CubieCube {
	cp: number[]; // corner permutation, length 8
	co: number[]; // corner orientation 0..2
	ep: number[]; // edge permutation, length 12
	eo: number[]; // edge orientation 0..1
	// Center orientation in quarter turns (0..3), indexed by face. Invisible
	// on a standard 3x3, but visible on supercubes and the Mastermorphix.
	ct: number[];
}

export function solvedCube(): CubieCube {
	return {
		cp: [0, 1, 2, 3, 4, 5, 6, 7],
		co: [0, 0, 0, 0, 0, 0, 0, 0],
		ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [0, 0, 0, 0, 0, 0]
	};
}

export function cloneCube(c: CubieCube): CubieCube {
	return { cp: [...c.cp], co: [...c.co], ep: [...c.ep], eo: [...c.eo], ct: [...c.ct] };
}

/** Apply `b` after `a`. */
export function multiply(a: CubieCube, b: CubieCube): CubieCube {
	const cp = new Array(8);
	const co = new Array(8);
	for (let i = 0; i < 8; i++) {
		cp[i] = a.cp[b.cp[i]];
		co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
	}
	const ep = new Array(12);
	const eo = new Array(12);
	for (let i = 0; i < 12; i++) {
		ep[i] = a.ep[b.ep[i]];
		eo[i] = (a.eo[b.ep[i]] + b.eo[i]) % 2;
	}
	const ct = a.ct.map((t, f) => (t + b.ct[f]) % 4);
	return { cp, co, ep, eo, ct };
}

// The six clockwise quarter turns, as cubes.
const BASIC_MOVES: CubieCube[] = [
	{
		// U
		cp: [3, 0, 1, 2, 4, 5, 6, 7],
		co: [0, 0, 0, 0, 0, 0, 0, 0],
		ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [1, 0, 0, 0, 0, 0]
	},
	{
		// R
		cp: [4, 1, 2, 0, 7, 5, 6, 3],
		co: [2, 0, 0, 1, 1, 0, 0, 2],
		ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [0, 1, 0, 0, 0, 0]
	},
	{
		// F
		cp: [1, 5, 2, 3, 0, 4, 6, 7],
		co: [1, 2, 0, 0, 2, 1, 0, 0],
		ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11],
		eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
		ct: [0, 0, 1, 0, 0, 0]
	},
	{
		// D
		cp: [0, 1, 2, 3, 5, 6, 7, 4],
		co: [0, 0, 0, 0, 0, 0, 0, 0],
		ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [0, 0, 0, 1, 0, 0]
	},
	{
		// L
		cp: [0, 2, 6, 3, 4, 1, 5, 7],
		co: [0, 1, 2, 0, 0, 2, 1, 0],
		ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [0, 0, 0, 0, 1, 0]
	},
	{
		// B
		cp: [0, 1, 3, 7, 4, 5, 2, 6],
		co: [0, 0, 1, 2, 0, 0, 2, 1],
		ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7],
		eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
		ct: [0, 0, 0, 0, 0, 1]
	}
];

// All 18 face turns; move index m = face * 3 + (power - 1).
export const MOVE_NAMES: string[] = FACES.flatMap((f) => [f, f + '2', f + "'"]);
export const MOVE_CUBES: CubieCube[] = BASIC_MOVES.flatMap((mv) => {
	const m2 = multiply(mv, mv);
	return [mv, m2, multiply(m2, mv)];
});

export function applyMove(c: CubieCube, m: number): CubieCube {
	return multiply(c, MOVE_CUBES[m]);
}

export function applyMoves(c: CubieCube, moves: number[]): CubieCube {
	return moves.reduce(applyMove, c);
}

export function inverseMoves(moves: number[]): number[] {
	return [...moves].reverse().map((m) => m - (m % 3) + (2 - (m % 3)));
}

/** Parse "R U2 F' ..." into move indices. Throws on unknown tokens. */
export function parseMoves(s: string): number[] {
	return s
		.trim()
		.split(/\s+/)
		.filter((t) => t.length > 0)
		.map((t) => {
			const m = MOVE_NAMES.indexOf(t.replace('’', "'"));
			if (m < 0) throw new Error(`Unknown move "${t}"`);
			return m;
		});
}

export function formatMoves(moves: number[]): string {
	return moves.map((m) => MOVE_NAMES[m]).join(' ');
}

export function permutationParity(p: number[]): number {
	let parity = 0;
	for (let i = 0; i < p.length; i++) {
		for (let j = i + 1; j < p.length; j++) {
			if (p[i] > p[j]) parity ^= 1;
		}
	}
	return parity;
}

export function isSolved(c: CubieCube, withCenters = false): boolean {
	return (
		c.cp.every((v, i) => v === i) &&
		c.co.every((v) => v === 0) &&
		c.ep.every((v, i) => v === i) &&
		c.eo.every((v) => v === 0) &&
		(!withCenters || c.ct.every((v) => v === 0))
	);
}

function shuffled(n: number, rand: () => number): number[] {
	const a = Array.from({ length: n }, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Uniformly random reachable state. Centers are left solved unless
 * `withCenters`, in which case they get random turns too — subject to the
 * rule that every quarter turn both turns a center and makes an odd corner
 * permutation, so the total center turn count has the corner parity.
 */
export function randomCube(rand: () => number = Math.random, withCenters = false): CubieCube {
	const cp = shuffled(8, rand);
	const ep = shuffled(12, rand);
	// Corner and edge permutation parity must agree; swap two edges if not.
	if (permutationParity(cp) !== permutationParity(ep)) [ep[0], ep[1]] = [ep[1], ep[0]];
	const co = Array.from({ length: 8 }, () => Math.floor(rand() * 3));
	co[7] = (3 - (co.slice(0, 7).reduce((s, v) => s + v, 0) % 3)) % 3;
	const eo = Array.from({ length: 12 }, () => Math.floor(rand() * 2));
	eo[11] = eo.slice(0, 11).reduce((s, v) => s + v, 0) % 2;
	const ct = [0, 0, 0, 0, 0, 0];
	if (withCenters) {
		for (let f = 0; f < 6; f++) ct[f] = Math.floor(rand() * 4);
		if ((ct.reduce((s, v) => s + v, 0) + permutationParity(cp)) % 2) ct[5] = (ct[5] + 1) % 4;
	}
	return { cp, co, ep, eo, ct };
}
