// Sticker layer for a standard 3x3: 54 facelets <-> CubieCube.
//
// Facelet index = face * 9 + k, faces in U R F D L B order, k reading
// left-to-right, top-to-bottom as seen from outside the face with the
// standard net orientation:
//
//            U
//         L  F  R  B
//            D
//
// Each facelet holds a colour, identified by the face whose center has that
// colour (0..5), or null if not painted yet. Centers are fixed (face turns
// never move them), so the center colours define the scheme.

import { type CubieCube, CORNER_NAMES, EDGE_NAMES, permutationParity, U, R, F, D, L, B } from './cubie';

export type Facelets = (number | null)[];

export const COLOR_NAMES = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];

const f = (face: number, k: number) => face * 9 + k - 1;

// Facelets of each corner slot, starting with its U/D sticker, clockwise.
export const CORNER_FACELETS = [
	[f(U, 9), f(R, 1), f(F, 3)],
	[f(U, 7), f(F, 1), f(L, 3)],
	[f(U, 1), f(L, 1), f(B, 3)],
	[f(U, 3), f(B, 1), f(R, 3)],
	[f(D, 3), f(F, 9), f(R, 7)],
	[f(D, 1), f(L, 9), f(F, 7)],
	[f(D, 7), f(B, 9), f(L, 7)],
	[f(D, 9), f(R, 9), f(B, 7)]
];
export const CORNER_COLORS = [
	[U, R, F],
	[U, F, L],
	[U, L, B],
	[U, B, R],
	[D, F, R],
	[D, L, F],
	[D, B, L],
	[D, R, B]
];

export const EDGE_FACELETS = [
	[f(U, 6), f(R, 2)],
	[f(U, 8), f(F, 2)],
	[f(U, 4), f(L, 2)],
	[f(U, 2), f(B, 2)],
	[f(D, 6), f(R, 8)],
	[f(D, 2), f(F, 8)],
	[f(D, 4), f(L, 8)],
	[f(D, 8), f(B, 8)],
	[f(F, 6), f(R, 4)],
	[f(F, 4), f(L, 6)],
	[f(B, 6), f(L, 4)],
	[f(B, 4), f(R, 6)]
];
export const EDGE_COLORS = [
	[U, R],
	[U, F],
	[U, L],
	[U, B],
	[D, R],
	[D, F],
	[D, L],
	[D, B],
	[F, R],
	[F, L],
	[B, L],
	[B, R]
];

export function isCenter(index: number): boolean {
	return index % 9 === 4;
}

/** All stickers unpainted except the fixed centers. */
export function blankFacelets(): Facelets {
	return Array.from({ length: 54 }, (_, i) => (isCenter(i) ? Math.floor(i / 9) : null));
}

export function toFacelets(c: CubieCube): number[] {
	const out = Array.from({ length: 54 }, (_, i) => Math.floor(i / 9));
	for (let i = 0; i < 8; i++) {
		for (let n = 0; n < 3; n++) {
			out[CORNER_FACELETS[i][(n + c.co[i]) % 3]] = CORNER_COLORS[c.cp[i]][n];
		}
	}
	for (let i = 0; i < 12; i++) {
		for (let n = 0; n < 2; n++) {
			out[EDGE_FACELETS[i][(n + c.eo[i]) % 2]] = EDGE_COLORS[c.ep[i]][n];
		}
	}
	return out;
}

export type ParseResult = { ok: true; cube: CubieCube } | { ok: false; errors: string[] };

const colorList = (cols: number[]) => cols.map((c) => COLOR_NAMES[c]).join('-');

/**
 * Read a painted cube. Errors are phrased for someone holding a physical
 * cube — most mean a sticker was painted wrong, the last three mean the
 * cube was taken apart and reassembled (or a sticker is misplaced).
 */
export function fromFacelets(facelets: Facelets): ParseResult {
	const unpainted = facelets.filter((c) => c === null).length;
	if (unpainted > 0) {
		return { ok: false, errors: [`${unpainted} sticker${unpainted === 1 ? '' : 's'} left to paint.`] };
	}
	const fc = facelets as number[];
	const errors: string[] = [];

	for (let face = 0; face < 6; face++) {
		if (fc[face * 9 + 4] !== face) errors.push('Center stickers must keep their colours.');
	}
	const counts = [0, 0, 0, 0, 0, 0];
	fc.forEach((c) => counts[c]++);
	counts.forEach((n, c) => {
		if (n !== 9) errors.push(`There are ${n} ${COLOR_NAMES[c]} stickers, expected 9.`);
	});
	if (errors.length) return { ok: false, errors };

	const cp = new Array(8).fill(-1);
	const co = new Array(8).fill(0);
	for (let i = 0; i < 8; i++) {
		const cols = CORNER_FACELETS[i].map((idx) => fc[idx]);
		const ori = cols.findIndex((c) => c === U || c === D);
		const j =
			ori < 0
				? -1
				: CORNER_COLORS.findIndex(
						(cc) =>
							cc[0] === cols[ori] && cc[1] === cols[(ori + 1) % 3] && cc[2] === cols[(ori + 2) % 3]
					);
		if (j < 0) {
			errors.push(`No corner has the colours ${colorList(cols)} (at ${CORNER_NAMES[i]}).`);
		} else {
			cp[i] = j;
			co[i] = ori;
		}
	}
	const ep = new Array(12).fill(-1);
	const eo = new Array(12).fill(0);
	for (let i = 0; i < 12; i++) {
		const [a, b] = EDGE_FACELETS[i].map((idx) => fc[idx]);
		const j0 = EDGE_COLORS.findIndex((ec) => ec[0] === a && ec[1] === b);
		const j1 = EDGE_COLORS.findIndex((ec) => ec[0] === b && ec[1] === a);
		if (j0 >= 0) ep[i] = j0;
		else if (j1 >= 0) {
			ep[i] = j1;
			eo[i] = 1;
		} else errors.push(`No edge has the colours ${colorList([a, b])} (at ${EDGE_NAMES[i]}).`);
	}
	if (errors.length) return { ok: false, errors };

	for (let j = 0; j < 8; j++) {
		const n = cp.filter((v) => v === j).length;
		if (n > 1) errors.push(`The ${colorList(CORNER_COLORS[j])} corner appears ${n} times.`);
	}
	for (let j = 0; j < 12; j++) {
		const n = ep.filter((v) => v === j).length;
		if (n > 1) errors.push(`The ${colorList(EDGE_COLORS[j])} edge appears ${n} times.`);
	}
	if (errors.length) return { ok: false, errors };

	if (co.reduce((s, v) => s + v, 0) % 3 !== 0) {
		errors.push('One corner is twisted in place — this position cannot be reached by turning.');
	}
	if (eo.reduce((s, v) => s + v, 0) % 2 !== 0) {
		errors.push('One edge is flipped in place — this position cannot be reached by turning.');
	}
	if (permutationParity(cp) !== permutationParity(ep)) {
		errors.push('Two pieces are swapped — this position cannot be reached by turning.');
	}
	if (errors.length) return { ok: false, errors };

	return { ok: true, cube: { cp, co, ep, eo, ct: [0, 0, 0, 0, 0, 0] } };
}
